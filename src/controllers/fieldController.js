const Complaint = require('../models/Complaint');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');

// @desc    Start work & upload "Before" photo
// @route   PUT /api/field/complaints/:id/start
// @access  Private (Field Worker)
exports.startWork = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure the worker is assigned to this complaint
    if (complaint.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to work on this complaint' });
    }

    if (complaint.status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Complaint is not in assigned state' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Before photo is required' });
    }

    // Upload to Cloudinary
    const beforeImageUrl = await uploadBufferToCloudinary(req.file.buffer, 'nagardrishti/before');

    complaint.status = 'in_progress';
    complaint.beforeImage = beforeImageUrl;
    complaint.statusHistory.push({
      status: 'in_progress',
      timestamp: new Date(),
      note: 'Field team arrived and started work.',
    });

    await complaint.save();

    // Notify Citizen
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `*Work Started*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nThe field team has arrived and started working on your complaint.\n\n⏱ Expected completion: 2-3 hours.`
    );

    res.json({ success: true, message: 'Work started', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete work & upload "After" photo
// @route   PUT /api/field/complaints/:id/resolve
// @access  Private (Field Worker)
exports.resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { workNote } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (complaint.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Complaint is not in progress' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'After photo is required' });
    }

    // Upload to Cloudinary
    const afterImageUrl = await uploadBufferToCloudinary(req.file.buffer, 'nagardrishti/after');

    complaint.status = 'resolved';
    complaint.afterImage = afterImageUrl;
    complaint.workNote = workNote || 'Work completed successfully.';
    complaint.statusHistory.push({
      status: 'resolved',
      timestamp: new Date(),
      note: `Work completed. Note: ${workNote}`,
    });

    await complaint.save();

    // Notify Citizen
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `*Work Completed*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nThe field team has completed the work.\n\n Note: ${complaint.workNote}\n\nWaiting for Admin verification.`
    );

    res.json({ success: true, message: 'Complaint resolved and submitted for verification', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};