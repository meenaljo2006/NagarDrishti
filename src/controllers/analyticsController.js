const Complaint = require('../models/Complaint');

// @desc    Get statistics for Super Admin (City-wide)
// @route   GET /api/analytics/super-admin
// @access  Private (Super Admin only)
exports.getSuperAdminStats = async (req, res) => {
  try {
    // 1. Status Breakdown
    const statusStats = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Category Breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } }
    ]);

    // 3. Department Breakdown
    const departmentStats = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // 4. Average Resolution Time (in hours)
    const resolvedStats = await Complaint.aggregate([
      { $match: { status: 'closed', resolvedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: {
            $divide: [{ $subtract: ['$resolvedAt', '$reportedAt'] }, 1000 * 60 * 60]
          }
        }
      },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }
    ]);

    const totalComplaints = await Complaint.countDocuments();
    const avgResolutionTime = resolvedStats.length > 0 ? Math.round(resolvedStats[0].avgTime * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        totalComplaints,
        avgResolutionTime,
        statusStats,
        categoryStats,
        departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get statistics for Dept Admin (Only their department)
// @route   GET /api/analytics/dept-admin
// @access  Private (Dept Admin)
exports.getDeptAdminStats = async (req, res) => {
  try {
    const department = req.user.department; // e.g., 'roads'
    
    if (!department) {
       return res.status(400).json({ success: false, message: 'User has no assigned department' });
    }

    const matchFilter = { department: department };

    // Status Breakdown for this dept
    const statusStats = await Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Category Breakdown for this dept
    const categoryStats = await Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } }
    ]);

    const totalComplaints = await Complaint.countDocuments(matchFilter);

    res.json({
      success: true,
      data: {
        department,
        totalComplaints,
        statusStats,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get heatmap data (Coordinates of all active/verified complaints)
// @route   GET /api/analytics/heatmap
// @access  Private (Super Admin, Dept Admin)
exports.getHeatmapData = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'dept_admin') {
      filter.department = req.user.department;
    }

    // Get only active (not closed/rejected) complaints for the live heatmap
    filter.status = { $in: ['verified', 'assigned', 'in_progress'] };

    const complaints = await Complaint.find(filter).select('location aiAnalysis.category priority status');

    // Map to simple format for frontend map libraries (like Leaflet)
    const heatmapData = complaints.map(c => ({
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0],
      category: c.aiAnalysis.category,
      priority: c.priority,
      status: c.status
    }));

    res.json({ success: true, data: heatmapData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get complaints trend for the last 7 days
// @route   GET /api/analytics/trends
// @access  Private (Super Admin, Dept Admin)
exports.getTrends = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const matchFilter = { reportedAt: { $gte: sevenDaysAgo } };
    if (req.user.role === 'dept_admin') {
      matchFilter.department = req.user.department;
    }

    const trends = await Complaint.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // Sort by date ascending
    ]);

    // Format for charting libraries like Recharts/Chart.js
    const formattedData = trends.map(item => ({
      date: item._id,
      complaints: item.count
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};