const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// @desc    Assign a complaint to a field worker
// @route   PUT /api/admin/complaints/:id/assign
// @access  Private (Dept Admin, Super Admin)
exports.assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body; // Field worker's User ID

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure complaint is verified before assigning
    if (complaint.status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Complaint must be verified before assigning' });
    }

    // Check if team exists
    const fieldWorker = await User.findById(teamId);
    if (!fieldWorker || fieldWorker.role !== 'field_worker') {
      return res.status(400).json({ success: false, message: 'Invalid field team ID' });
    }

    // Update complaint
    complaint.status = 'assigned';
    complaint.assignedTo = fieldWorker._id;
    complaint.statusHistory.push({
      status: 'assigned',
      timestamp: new Date(),
      note: `Assigned to field worker: ${fieldWorker.name} (${fieldWorker.zone})`,
    });

    await complaint.save();

    // Notify Citizen
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `*Complaint Assigned*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nYour complaint has been accepted by the ${complaint.department} department.\n\n👷 Team assigned: ${fieldWorker.name}\n📍 Team will reach your location soon.`
    );

    res.json({
      success: true,
      message: `Complaint assigned to ${fieldWorker.name}`,
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get verified complaints for a specific department
// @route   GET /api/admin/complaints
// @access  Private (Dept Admin)
exports.getDeptComplaints = async (req, res) => {
  try {
    // If Super Admin, get all. If Dept Admin, get only their department.
    const filter = req.user.role === 'super_admin' ? {} : { department: req.user.department };
    
    // We exclude resolved/closed for the active dashboard
    filter.status = { $in: ['verified', 'assigned', 'in_progress'] };

    const complaints = await Complaint.find(filter)
      .populate('assignedTo', 'name zone phone')
      .sort({ priority: -1, reportedAt: -1 }); // High priority first

    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify field work and close complaint
// @route   PUT /api/admin/complaints/:id/close
// @access  Private (Dept Admin, Super Admin)
exports.closeComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the original complaint
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure it's in 'resolved' state
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ success: false, message: 'Complaint is not resolved yet' });
    }

    // 1. Update status to closed
    complaint.status = 'closed';
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = req.user.name; // Save the Admin's name who closed it
    complaint.resolutionNote = req.body.adminNote || 'Verified and closed by admin.';

    complaint.statusHistory.push({
      status: 'closed',
      timestamp: new Date(),
      note: 'Admin verified the proof and closed the complaint.',
    });

    await complaint.save();

    // 2. Notify the ORIGINAL reporter
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `*Complaint Resolved & Closed*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\n\nGood news! Your complaint has been officially RESOLVED.\n\nProof: ${complaint.afterImage}\nNote: ${complaint.workNote}\n\nThank you for helping make our city better!\n\nPlease rate our service (1-5).`
    );

    // 3. CASCADE NOTIFICATION: Notify all DUPLICATE reporters
    const duplicates = await Complaint.find({ 'aiAnalysis.duplicateOf': complaint._id });
    
    if (duplicates.length > 0) {
      console.log(`Sending resolution updates to ${duplicates.length} duplicate reporters...`);
      
      for (const dup of duplicates) {
        await sendWhatsAppMessage(
          dup.citizenPhone,
          `*Update on your reported issue*\n━━━━━━━━━━━━━━━━\nThe issue you reported (linked to original ID: ${complaint._id}) has been officially RESOLVED.\n\nThank you for your patience!`
        );
      }
    }

    res.json({
      success: true,
      message: 'Complaint closed successfully. Citizens notified.',
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};