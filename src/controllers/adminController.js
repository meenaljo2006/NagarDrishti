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

    // Notify Duplicate Citizens
    const duplicates = await Complaint.find({ 'aiAnalysis.duplicateOf': complaint._id });
    for (const dup of duplicates) {
        await sendWhatsAppMessage(
          dup.citizenPhone,
          `*Update on your reported issue*\n━━━━━━━━━━━━━━━━\nA team has been assigned to resolve the issue you reported.\n\n👷 Team assigned: ${fieldWorker.name}`
        );
    }

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
    
    filter.status = { $in: ['verified', 'assigned', 'in_progress','closed','resolved'] };

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

// @desc    Get all users (Super Admin only)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude passwords
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new user (Super Admin creates Admins, Dept Admin creates Workers)
// @route   POST /api/admin/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, department, zone } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // 2. Role-based Access Control
    if (req.user.role === 'dept_admin') {
      // Dept Admins can ONLY create field workers for THEIR department
      if (role !== 'field_worker') {
        return res.status(403).json({ success: false, message: 'Dept Admins can only create Field Workers' });
      }
      if (department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'You can only create workers for your own department' });
      }
    }

    // 3. Create the user
    const user = await User.create({
      name, email, phone, password, role, department, zone
    });

    res.status(201).json({
      success: true,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all field workers for the Dept Admin's department
// @route   GET /api/admin/field-team
exports.getFieldTeam = async (req, res) => {
  try {
    // Find workers in the same department as the logged-in admin
    const workers = await User.find({ 
      role: 'field_worker', 
      department: req.user.department 
    }).select('name zone phone');

    res.json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a verified complaint manually
// @route   PUT /api/admin/complaints/:id/reject
exports.rejectComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (['closed', 'rejected', 'resolved'].includes(complaint.status)) {
       return res.status(400).json({ success: false, message: 'Cannot reject a completed complaint' });
    }

    const reason = req.body && req.body.reason ? req.body.reason : 'Invalid or unclear complaint';

    complaint.status = 'rejected';
    complaint.statusHistory.push({
      status: 'rejected',
      timestamp: new Date(),
      note: `Rejected by Admin. Reason: ${reason || 'Invalid complaint'}`
    });

    await complaint.save();

    // Notify Citizen
    await sendWhatsAppMessage(
      complaint.citizenPhone,
      `*Complaint Rejected*\n━━━━━━━━━━━━━━━━\nID: ${complaint._id}\nYour complaint was reviewed by the department and rejected.\n\nReason: ${req.body.reason || 'Does not meet criteria'}`
    );

    res.json({ success: true, message: 'Complaint rejected', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};