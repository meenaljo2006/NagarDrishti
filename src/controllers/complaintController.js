const Complaint = require('../models/Complaint');
const { analyzeComplaint, getDepartmentForCategory, calculatePriority } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { reverseGeocode } = require('../utils/geocoder');

// Create a new complaint
exports.createComplaint = async (data) => {
  const {
    citizenName,
    citizenPhone,
    description,
    imageUrl,
    location,
    address: providedAddress,
    whatsappMessageSid,
  } = data;

  // Validate minimum requirements
  if (!citizenPhone || !imageUrl) {
    throw new Error('Missing required fields: citizenPhone or imageUrl');
  }

  // Ensure location has default if not provided
  const safeLocation = location || {
    type: 'Point',
    coordinates: [78.9629, 20.5937], 
  };

  // Reverse geocode to get a human-readable address
  let finalAddress = providedAddress;
  if (!finalAddress || finalAddress === 'Location not provided') {
    finalAddress = await reverseGeocode(safeLocation.coordinates);
  }


  // Create the complaint
  const complaint = new Complaint({
    citizenName,
    citizenPhone,
    description: description || 'No description provided',
    imageUrl,
    location: safeLocation,
    address: finalAddress,
    whatsappMessageSid,
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(),
        note: 'Complaint received via WhatsApp',
      },
    ],
  });

  await complaint.save();
  console.log(`Complaint created: ${complaint._id}`);

  // Send acknowledgment to citizen
  await sendWhatsAppMessage(
    citizenPhone,
    `*NagarDrishti*\n_See. Verify. Resolve._\n\n Complaint Received!\n━━━━━━━━━━━━━━━━\n ID: ${complaint._id}\n Status: Under AI Verification\n We'll update you shortly.`
  );

  // Trigger AI analysis asynchronously
  processAI(complaint._id).catch((err) =>
    console.error('Background AI error:', err)
  );

  return complaint;
};


// Background AI processing
async function processAI(complaintId) {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) return;

  try {
    const aiResult = await analyzeComplaint({
      description: complaint.description,
      imageUrl: complaint.imageUrl,
      location: complaint.location,
    });

    // Update complaint with AI results
    complaint.aiAnalysis = {
      isValid: aiResult.isValid,
      category: aiResult.category,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      descriptionAnalysis: aiResult.descriptionAnalysis,
      duplicateOf: null,
    };

    if (aiResult.isValid && aiResult.confidence >= 0.7) {
      // Verified
      complaint.status = 'verified';
      complaint.department = getDepartmentForCategory(aiResult.category);
      complaint.priority = calculatePriority(aiResult.severity);
      complaint.statusHistory.push({
        status: 'verified',
        timestamp: new Date(),
        note: `AI verified. Category: ${aiResult.category}, Severity: ${aiResult.severity}`,
      });

      await complaint.save();

      // Notify citizen
      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `*Complaint Verified!*\n━━━━━━━━━━━━━━━━\n ID: ${complaint._id}\n Category: ${aiResult.category}\n Severity: ${aiResult.severity}\n Routed to: ${complaint.department} dept\n Priority: ${complaint.priority}/5\n\nWe'll update you on progress.`
      );
    } else {
      // Rejected
      complaint.status = 'rejected';
      complaint.statusHistory.push({
        status: 'rejected',
        timestamp: new Date(),
        note: 'AI verification failed',
      });

      await complaint.save();

      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `*Complaint Could Not Be Verified*\n━━━━━━━━━━━━━━━━\nPlease resubmit with:\n Clear photo\n Accurate location\n Specific description`
      );
    }
  } catch (error) {
    console.error('AI processing error:', error);

    // Mark for manual review
    complaint.statusHistory.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'AI failed. Marked for manual review.',
    });
    await complaint.save();
  }
}

// Get complaints for admin Dashboard
exports.getComplaints = async (req, res) => {
  try {
    const { status, department, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const complaints = await Complaint.find(filter)
      .sort({ reportedAt: -1 })
      .skip((page - 1) * limit)
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single complaint
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};