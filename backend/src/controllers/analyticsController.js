const Analytics = require('../models/Analytics');
const Complaint = require('../models/Complaint');

// Get analytics dashboard data
exports.getDashboardStats = async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Get total counts
    const totalComplaints = await Complaint.countDocuments();
    const verifiedComplaints = await Complaint.countDocuments({ status: 'verified' });
    const rejectedComplaints = await Complaint.countDocuments({ status: 'rejected' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const pendingComplaints = await Complaint.countDocuments({ status: { $in: ['pending', 'assigned', 'in_progress'] } });

    // Get category distribution
    const categoryDistribution = await Complaint.aggregate([
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get daily trends for period
    const dailyTrends = await Complaint.aggregate([
      {
        $match: {
          reportedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportedAt' } },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get department workload
    const departmentWorkload = await Complaint.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'assigned', 'in_progress']] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
    ]);

    // Calculate average resolution time
    const resolvedComplaintsData = await Complaint.find({
      status: 'resolved',
      resolvedAt: { $exists: true },
    }).select('reportedAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedComplaintsData.length > 0) {
      const totalTime = resolvedComplaintsData.reduce((sum, c) => {
        const diff = (c.resolvedAt - c.reportedAt) / (1000 * 60 * 60); // hours
        return sum + diff;
      }, 0);
      avgResolutionTime = totalTime / resolvedComplaintsData.length;
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalComplaints,
          verifiedComplaints,
          rejectedComplaints,
          resolvedComplaints,
          pendingComplaints,
          avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
        },
        categoryDistribution,
        dailyTrends,
        departmentWorkload,
      },
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get heatmap data for complaints
exports.getHeatmapData = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const complaints = await Complaint.find({
      reportedAt: { $gte: startDate },
      status: { $in: ['verified', 'assigned', 'in_progress', 'resolved'] },
      'location.coordinates': { $exists: true },
    }).select('location aiAnalysis.category reportedAt');

    // Group complaints by location (simplified for heatmap)
    const heatmapData = complaints.map(c => ({
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0],
      weight: c.aiAnalysis.severity === 'high' ? 0.8 : 
              c.aiAnalysis.severity === 'medium' ? 0.5 : 0.3,
      category: c.aiAnalysis.category,
    }));

    res.json({
      success: true,
      data: heatmapData,
    });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};