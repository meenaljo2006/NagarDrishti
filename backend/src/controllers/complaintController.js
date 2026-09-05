const Complaint = require('../models/Complaint');
const Analytics = require('../models/Analytics');
const { callAIService } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// Create new complaint from WhatsApp
exports.createComplaint = async (req, res) => {
  try {
    const { 
      citizenName, 
      citizenPhone, 
      description, 
      location, 
      address, 
      imageUrl,
      whatsappMessageSid 
    } = req.body;

    // Validate required fields
    if (!citizenName || !citizenPhone || !description || !location || !address || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Step 1: Create initial complaint with pending status
    const complaint = new Complaint({
      citizenName,
      citizenPhone,
      description,
      location,
      address,
      imageUrl,
      whatsappMessageSid,
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Complaint received',
      }],
    });

    await complaint.save();

    // Step 2: Call AI Service for verification (async)
    // We'll process this in background to keep response fast
    processAIAnalysis(complaint._id);

    // Step 3: Send acknowledgment to citizen
    await sendWhatsAppMessage(
      citizenPhone,
      `✅ Thank you for reporting! Your complaint has been received.\n\n🔢 Reference ID: ${complaint._id}\n📋 Status: Under AI Verification\n⏳ We'll update you shortly.`
    );

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: complaint,
    });

  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Background process for AI analysis
async function processAIAnalysis(complaintId) {
  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return;

    // Call AI service
    const aiResult = await callAIService({
      imageUrl: complaint.imageUrl,
      description: complaint.description,
      location: complaint.location,
    });

    // Update complaint with AI results
    complaint.aiAnalysis = {
      isValid: aiResult.isValid,
      category: aiResult.category,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      descriptionAnalysis: aiResult.descriptionAnalysis,
    };

    // Update status based on AI verification
    if (aiResult.isValid && aiResult.confidence > 0.7) {
      complaint.status = 'verified';
      complaint.department = getDepartmentForCategory(aiResult.category);
      complaint.priority = calculatePriority(aiResult.severity);
      
      complaint.statusHistory.push({
        status: 'verified',
        timestamp: new Date(),
        note: `✅ AI Verification passed. Category: ${aiResult.category}, Severity: ${aiResult.severity}`,
      });

      // Notify citizen
      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `✅ Your complaint has been VERIFIED!\n\n📋 Category: ${aiResult.category}\n⚠️ Severity: ${aiResult.severity}\n🏛️ Department: ${complaint.department}\n\nWe'll update you on progress.`
      );

    } else {
      complaint.status = 'rejected';
      complaint.statusHistory.push({
        status: 'rejected',
        timestamp: new Date(),
        note: 'AI Verification failed. Invalid or unclear complaint.',
      });

      // Notify citizen
      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `Your complaint could not be verified.\n\nPlease ensure you:\n📸 Upload a clear image\n📍 Share accurate location\n📝 Provide clear description\n\nYou can resubmit with better information.`
      );
    }

    await complaint.save();

    // Update analytics
    await updateAnalytics(complaint);

  } catch (error) {
    console.error('AI Analysis Error:', error);
    // Don't fail the complaint, mark for manual review
    const complaint = await Complaint.findById(complaintId);
    if (complaint) {
      complaint.status = 'pending';
      complaint.statusHistory.push({
        status: 'pending',
        timestamp: new Date(),
        note: '⚠️ AI Analysis failed. Marked for manual review.',
      });
      await complaint.save();
    }
  }
}

// Helper functions
function getDepartmentForCategory(category) {
  const mapping = {
    pothole: 'roads',
    garbage: 'sanitation',
    streetlight: 'electricity',
    water_leakage: 'water',
    road_damage: 'roads',
  };
  return mapping[category] || 'other';
}

function calculatePriority(severity) {
  const mapping = {
    high: 5,
    medium: 3,
    low: 1,
  };
  return mapping[severity] || 3;
}

// Update analytics
async function updateAnalytics(complaint) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analytics = await Analytics.findOne({ date: today });
  if (!analytics) {
    analytics = new Analytics({ date: today });
  }

  analytics.totalComplaints += 1;

  if (complaint.status === 'verified') {
    analytics.verifiedComplaints += 1;
    analytics.byCategory[complaint.aiAnalysis.category] = 
      (analytics.byCategory[complaint.aiAnalysis.category] || 0) + 1;
    analytics.byDepartment[complaint.department] = 
      (analytics.byDepartment[complaint.department] || 0) + 1;
  } else if (complaint.status === 'rejected') {
    analytics.rejectedComplaints += 1;
  }

  await analytics.save();
}

// Get all complaints (with filters)
exports.getComplaints = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      department, 
      startDate, 
      endDate,
      page = 1,
      limit = 10 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter['aiAnalysis.category'] = category;
    if (department) filter.department = department;
    if (startDate || endDate) {
      filter.reportedAt = {};
      if (startDate) filter.reportedAt.$gte = new Date(startDate);
      if (endDate) filter.reportedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(filter)
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get single complaint by ID
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }
    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`,
    });

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Notify citizen about status update
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `📢 Complaint Status Updated!\n\n🔢 ID: ${complaint._id}\n📋 Status: ${status.toUpperCase()}\n📝 Note: ${note || 'No additional notes'}\n\nThank you for your patience.`
    );

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: complaint,
    });

  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};