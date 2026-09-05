const Complaint = require('../models/Complaint');
const Analytics = require('../models/Analytics');
const { callAIService } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const SEND_WHATSAPP = process.env.SEND_WHATSAPP === 'true' || false;

// ============================================
// HELPER: Get Current IST Time String
// ============================================
const getISTString = () => {
  return new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// ============================================
// CREATE COMPLAINT
// ============================================
exports.createComplaint = async (req, res) => {
  try {
    console.log('📥 Received complaint data:', req.body);
    
    const { 
      citizenName, 
      citizenPhone, 
      description, 
      location, 
      address, 
      imageUrl,
      whatsappMessageSid 
    } = req.body;

    if (!citizenName || !citizenPhone || !description || !location || !address || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: req.body
      });
    }

    console.log('✅ Creating complaint for:', citizenName);

    // Get current IST time
    const now = new Date();
    const istString = getISTString();
    console.log('🕐 Current IST Time:', istString);

    // Create complaint with IST time
    const complaint = new Complaint({
      citizenName,
      citizenPhone,
      description,
      location,
      address,
      imageUrl,
      whatsappMessageSid: whatsappMessageSid || `web_${Date.now()}`,
      reportedAt: now,
      reportedAtIST: istString,
      statusHistory: [{
        status: 'pending',
        timestamp: now,
        timestampIST: istString,
        note: 'Complaint received',
      }],
    });

    await complaint.save();
    console.log('✅ Complaint saved with ID:', complaint._id);

    // Process AI in background
    processAIAnalysis(complaint._id).catch(err => {
      console.error('❌ Background AI processing error:', err);
    });

    // Return response
    const data = complaint.toObject();
    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: {
        ...data,
        displayTime: complaint.displayTime,
        timeAgo: complaint.timeAgo,
        statusBadge: complaint.statusBadge,
        displayName: complaint.displayName,
      },
    });

  } catch (error) {
    console.error('❌ Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// ============================================
// BACKGROUND AI ANALYSIS
// ============================================
async function processAIAnalysis(complaintId) {
  try {
    console.log('🤖 Starting AI analysis for:', complaintId);
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return;

    const aiResult = await callAIService({
      imageUrl: complaint.imageUrl,
      description: complaint.description,
      location: complaint.location,
    });

    console.log('🤖 AI Result:', aiResult);

    // Update AI analysis
    complaint.aiAnalysis = {
      isValid: aiResult.isValid,
      category: aiResult.category || 'other',
      confidence: aiResult.confidence || 0.5,
      severity: aiResult.severity || 'medium',
      descriptionAnalysis: aiResult.descriptionAnalysis || { 
        sentiment: 'neutral', 
        keywords: [],
        wordCount: complaint.description.split(' ').length,
      },
    };

    const now = new Date();
    const istString = getISTString();

    if (aiResult.isValid && aiResult.confidence > 0.7) {
      complaint.status = 'verified';
      complaint.isVerified = true;
      complaint.department = getDepartmentForCategory(aiResult.category);
      complaint.priority = calculatePriority(aiResult.severity);
      
      complaint.statusHistory.push({
        status: 'verified',
        timestamp: now,
        timestampIST: istString,
        note: `✅ AI Verified. Category: ${aiResult.category}, Confidence: ${(aiResult.confidence * 100).toFixed(0)}%, Severity: ${aiResult.severity}`,
      });

      console.log(`📱 [SKIP] Verified notification for ${complaint.citizenPhone}`);

    } else {
      complaint.status = 'rejected';
      complaint.isVerified = false;
      
      complaint.statusHistory.push({
        status: 'rejected',
        timestamp: now,
        timestampIST: istString,
        note: `❌ AI Verification failed. Confidence: ${(aiResult.confidence * 100).toFixed(0)}%`,
      });

      console.log(`📱 [SKIP] Rejected notification for ${complaint.citizenPhone}`);
    }

    await complaint.save();
    console.log('✅ Complaint updated with AI analysis:', complaint._id);
    await updateAnalytics(complaint);

  } catch (error) {
    console.error('❌ AI Analysis Error:', error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
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
  const mapping = { high: 5, medium: 3, low: 1 };
  return mapping[severity] || 3;
}

async function updateAnalytics(complaint) {
  try {
    const now = new Date();
    const istString = getISTString();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });
    if (!analytics) {
      analytics = new Analytics({ 
        date: today,
        dateIST: istString.split(',')[0],
        totalComplaints: 0,
        verifiedComplaints: 0,
        rejectedComplaints: 0,
        resolvedComplaints: 0,
        byCategory: {
          pothole: 0, garbage: 0, streetlight: 0,
          water_leakage: 0, road_damage: 0, other: 0
        },
        byDepartment: {
          roads: 0, sanitation: 0, electricity: 0, water: 0, other: 0
        },
        averageResolutionTime: 0
      });
    }

    analytics.totalComplaints += 1;

    if (complaint.status === 'verified') {
      analytics.verifiedComplaints += 1;
      const category = complaint.aiAnalysis.category || 'other';
      if (analytics.byCategory[category] !== undefined) {
        analytics.byCategory[category] += 1;
      }
      
      const department = complaint.department || 'other';
      if (analytics.byDepartment[department] !== undefined) {
        analytics.byDepartment[department] += 1;
      }
    } else if (complaint.status === 'rejected') {
      analytics.rejectedComplaints += 1;
    } else if (complaint.status === 'resolved') {
      analytics.resolvedComplaints += 1;
    }

    await analytics.save();
    console.log('✅ Analytics updated for IST date:', istString);

  } catch (error) {
    console.error('❌ Analytics Update Error:', error);
  }
}

// ============================================
// GET ALL COMPLAINTS
// ============================================
exports.getComplaints = async (req, res) => {
  try {
    const { 
      status, category, department, severity,
      startDate, endDate, search,
      page = 1, limit = 10 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter['aiAnalysis.category'] = category;
    if (department) filter.department = department;
    if (severity) filter['aiAnalysis.severity'] = severity;
    
    if (startDate || endDate) {
      filter.reportedAt = {};
      if (startDate) filter.reportedAt.$gte = new Date(startDate);
      if (endDate) filter.reportedAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { citizenName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const complaints = await Complaint.find(filter)
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    const formattedComplaints = complaints.map(complaint => ({
      ...complaint.toObject(),
      displayTime: complaint.displayTime,
      timeAgo: complaint.timeAgo,
      statusBadge: complaint.statusBadge,
      displayName: complaint.displayName,
    }));

    res.json({
      success: true,
      data: formattedComplaints,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('❌ Error fetching complaints:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// GET SINGLE COMPLAINT
// ============================================
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    res.json({
      success: true,
      data: {
        ...complaint.toObject(),
        displayTime: complaint.displayTime,
        timeAgo: complaint.timeAgo,
        statusBadge: complaint.statusBadge,
        displayName: complaint.displayName,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching complaint:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// UPDATE COMPLAINT STATUS
// ============================================
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, assignedTo } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const validStatuses = ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const now = new Date();
    const istString = getISTString();
    
    complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    
    complaint.statusHistory.push({
      status,
      timestamp: now,
      timestampIST: istString,
      note: note || `Status updated to ${status}`,
    });

    if (status === 'resolved') {
      complaint.resolvedAt = now;
      complaint.resolvedAtIST = istString;
    }

    await complaint.save();

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: {
        ...complaint.toObject(),
        displayTime: complaint.displayTime,
        timeAgo: complaint.timeAgo,
        statusBadge: complaint.statusBadge,
      },
    });

  } catch (error) {
    console.error('❌ Error updating complaint:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// GET COMPLAINT STATS
// ============================================
exports.getComplaintStats = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const verified = await Complaint.countDocuments({ status: 'verified' });
    const rejected = await Complaint.countDocuments({ status: 'rejected' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const pending = await Complaint.countDocuments({ status: { $in: ['pending', 'assigned', 'in_progress'] } });

    const categories = await Complaint.aggregate([
      { $match: { 'aiAnalysis.category': { $exists: true, $ne: null } } },
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, verified, rejected, resolved, pending },
        categories,
        lastUpdated: getISTString(),
      },
    });

  } catch (error) {
    console.error('❌ Error fetching complaint stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// BULK UPDATE COMPLAINTS
// ============================================
exports.bulkUpdateComplaints = async (req, res) => {
  try {
    const { complaintIds, status, note } = req.body;

    if (!complaintIds || !Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of complaint IDs',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a status to update',
      });
    }

    const now = new Date();
    const istString = getISTString();

    const result = await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            timestamp: now,
            timestampIST: istString,
            note: note || `Bulk update to ${status}`,
          },
        },
      }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} complaints`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        status,
        updatedAt: istString,
      },
    });

  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// DELETE COMPLAINT
// ============================================
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findByIdAndDelete(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.json({
      success: true,
      message: 'Complaint deleted successfully',
      deletedAt: getISTString(),
    });

  } catch (error) {
    console.error('❌ Error deleting complaint:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ============================================
// GET NEARBY COMPLAINTS
// ============================================
exports.getNearbyComplaints = async (req, res) => {
  try {
    const { lng, lat, radius = 5000, limit = 20 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude (lng) and latitude (lat)',
      });
    }

    const complaints = await Complaint.findNearby(
      parseFloat(lng),
      parseFloat(lat),
      parseFloat(radius)
    ).limit(parseInt(limit));

    const formattedComplaints = complaints.map(complaint => ({
      ...complaint.toObject(),
      displayTime: complaint.displayTime,
      timeAgo: complaint.timeAgo,
      statusBadge: complaint.statusBadge,
      displayName: complaint.displayName,
    }));

    res.json({
      success: true,
      data: formattedComplaints,
      count: formattedComplaints.length,
      location: { lng, lat, radius },
    });

  } catch (error) {
    console.error('❌ Error fetching nearby complaints:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};