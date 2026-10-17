const Complaint = require('../models/Complaint');
const { analyzeComplaint, getDepartmentForCategory, calculatePriority } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { reverseGeocode } = require('../utils/geocoder');
const { uploadTwilioImageToCloudinary } = require('../services/cloudinaryService');
const { findDuplicate, markAsDuplicate } = require('../services/duplicateService');

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

  // Upload Twilio image to Cloudinary
  let cloudinaryUrl = imageUrl;
  if (imageUrl && imageUrl.includes('api.twilio.com')) {
    console.log('Uploading Twilio image to Cloudinary...');
    cloudinaryUrl = await uploadTwilioImageToCloudinary(imageUrl);
    console.log('Cloudinary URL:', cloudinaryUrl);
  }


  // Create the complaint
  const complaint = new Complaint({
    citizenName,
    citizenPhone,
    description: description || 'No description provided',
    imageUrl: cloudinaryUrl,
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
    `*NagarDrishti*\n_See. Verify. Resolve._\n\nComplaint Registered!\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nStatus: Under AI Verification\nWe'll update you shortly.`
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
    console.log("\n=========================================================");
    console.log("NEW COMPLAINT VERIFICATION STARTED");
    console.log("=========================================================");
    console.log(`📸 Image URL: ${complaint.imageUrl}`);
    console.log(`📝 Description: "${complaint.description}"`);
    console.log(`📍 Location: [${complaint.location.coordinates}]`);

    // Call Python AI Service
    const aiResult = await analyzeComplaint({
      description: complaint.description,
      imageUrl: complaint.imageUrl,
      location: complaint.location,
    });

    // Update complaint with AI results
    complaint.category = aiResult.category;
    complaint.aiAnalysis = {
      isValid: aiResult.isValid,
      category: aiResult.category,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      descriptionAnalysis: {
        sentiment: aiResult.descriptionAnalysis.sentiment,
        keywords: aiResult.descriptionAnalysis.keywords,
      },
      duplicateOf: null,
    };

    if (aiResult.isValid && aiResult.confidence >= 0.35) {
      
      console.log("\n---------------------------------------------------------");
      console.log("DUPLICATE DETECTION (Node.js Backend)");
      console.log("---------------------------------------------------------");
      console.log(`Searching within 100m for existing '${aiResult.category}' complaints...`);

      // Check for duplicates
      const duplicate = await findDuplicate({
        category: aiResult.category,
        coordinates: complaint.location.coordinates,
      });

      if (duplicate) {
        await markAsDuplicate(complaint, duplicate._id);
        console.log(`Duplicate Found! Linked to original complaint ID: ${duplicate._id}`);
        console.log("=========================================================\n");
        return;
      }

      console.log("No duplicates found.");

      // Proceed as verified
      complaint.status = 'verified';
      complaint.department = getDepartmentForCategory(aiResult.category);
      complaint.priority = calculatePriority(aiResult.severity);
      
      complaint.statusHistory.push({
        status: 'verified',
        timestamp: new Date(),
        note: `AI verified. Category: ${aiResult.category}, Severity: ${aiResult.severity}`,
      });

      await complaint.save();

      console.log("\n---------------------------------------------------------");
      console.log("DATABASE UPDATE");
      console.log("---------------------------------------------------------");
      console.log(`Complaint Verified & Routed to: ${complaint.department.toUpperCase()} Department.`);
      console.log("=========================================================\n");

      // Send WhatsApp reply
      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `*Complaint Verified!*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nCategory: ${aiResult.category}\nSeverity: ${aiResult.severity}\nRouted to: ${complaint.department} dept\nPriority: ${complaint.priority}/5\n\nWe'll update you on progress.`
      );

    } else {
      console.log("\n---------------------------------------------------------");
      console.log("COMPLAINT REJECTED");
      console.log("---------------------------------------------------------");
      console.log(`Reason: ${aiResult.rejectionReason || 'Low confidence or invalid image'}`);
      console.log("=========================================================\n");

      complaint.status = 'rejected';
      complaint.statusHistory.push({
        status: 'rejected',
        timestamp: new Date(),
        note: `AI rejected: ${aiResult.rejectionReason || 'Low confidence'}`,
      });

      await complaint.save();

      const reason = aiResult.rejectionReason || 'Image does not clearly show the issue.';
      
      await sendWhatsAppMessage(
        complaint.citizenPhone,
        `*Complaint Rejected*\n━━━━━━━━━━━━━━━━\nReason: ${reason}\n\nPlease ensure your photo matches your description, or resubmit with a clearer image.`
      );
    }
  } catch (error) {
    console.error('\nAI processing error:', error.message);
    console.log("=========================================================\n");
    complaint.status = 'rejected';
    complaint.statusHistory.push({
      status: 'rejected',
      timestamp: new Date(),
      note: `AI verification failed: ${error.message}`,
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