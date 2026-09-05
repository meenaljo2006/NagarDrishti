const Analytics = require('../models/Analytics');
const Complaint = require('../models/Complaint');
const { getTodayIST, formatToIST } = require('../utils/timeUtils');

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
    } else if (period === 'today') {
      startDate = getTodayIST();
    }

    console.log(`📊 Fetching analytics for period: ${period} from ${startDate.toISOString()}`);

    // Get total counts
    const totalComplaints = await Complaint.countDocuments();
    const verifiedComplaints = await Complaint.countDocuments({ status: 'verified' });
    const rejectedComplaints = await Complaint.countDocuments({ status: 'rejected' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const pendingComplaints = await Complaint.countDocuments({ 
      status: { $in: ['pending', 'assigned', 'in_progress'] } 
    });

    // Get category distribution
    const categoryDistribution = await Complaint.aggregate([
      { $match: { 'aiAnalysis.category': { $exists: true, $ne: null } } },
      { 
        $group: { 
          _id: '$aiAnalysis.category', 
          count: { $sum: 1 },
          verified: { 
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } 
          },
          rejected: { 
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } 
          }
        } 
      },
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
          _id: { 
            $dateToString: { 
              format: '%Y-%m-%d', 
              date: '$reportedAt',
              timezone: 'Asia/Kolkata' 
            } 
          },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get department workload
    const departmentWorkload = await Complaint.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'assigned', 'in_progress']] }, 1, 0] },
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
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

    // Get recent complaints for dashboard
    const recentComplaints = await Complaint.find()
      .sort({ reportedAt: -1 })
      .limit(5)
      .select('citizenName description category status severity reportedAt');

    // Get severity distribution
    const severityDistribution = await Complaint.aggregate([
      {
        $match: {
          'aiAnalysis.severity': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$aiAnalysis.severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate complaint resolution rate
    const resolutionRate = totalComplaints > 0 
      ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1)
      : 0;

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend = await Complaint.aggregate([
      {
        $match: {
          reportedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: '%Y-%m', 
              date: '$reportedAt',
              timezone: 'Asia/Kolkata'
            } 
          },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

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
          resolutionRate: parseFloat(resolutionRate),
          totalDepartments: departmentWorkload.length,
          totalCategories: categoryDistribution.length,
        },
        categoryDistribution,
        dailyTrends,
        departmentWorkload,
        recentComplaints,
        severityDistribution,
        monthlyTrend,
        period: period,
        lastUpdated: formatToIST(new Date()),
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
    const { days = 30, category, severity } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Build filter
    const filter = {
      reportedAt: { $gte: startDate },
      status: { $in: ['verified', 'assigned', 'in_progress', 'resolved'] },
      'location.coordinates': { $exists: true },
    };

    if (category && category !== 'all') {
      filter['aiAnalysis.category'] = category;
    }

    if (severity && severity !== 'all') {
      filter['aiAnalysis.severity'] = severity;
    }

    const complaints = await Complaint.find(filter)
      .select('location aiAnalysis.category aiAnalysis.severity reportedAt');

    // Group complaints by location for heatmap
    const heatmapData = complaints.map(c => ({
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0],
      weight: c.aiAnalysis.severity === 'high' ? 0.9 : 
              c.aiAnalysis.severity === 'medium' ? 0.6 : 0.3,
      category: c.aiAnalysis.category || 'other',
      severity: c.aiAnalysis.severity || 'medium',
      reportedAt: c.reportedAt,
    }));

    // Get clusters for better visualization
    const clusterData = [];
    const clusterMap = new Map();

    heatmapData.forEach(point => {
      const key = `${Math.round(point.lat * 10) / 10},${Math.round(point.lng * 10) / 10}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          lat: point.lat,
          lng: point.lng,
          count: 0,
          categories: new Set(),
          severities: { high: 0, medium: 0, low: 0 },
        });
      }
      const cluster = clusterMap.get(key);
      cluster.count += 1;
      cluster.categories.add(point.category);
      if (point.severity === 'high') cluster.severities.high += 1;
      else if (point.severity === 'medium') cluster.severities.medium += 1;
      else cluster.severities.low += 1;
    });

    clusterMap.forEach((value, key) => {
      clusterData.push({
        lat: value.lat,
        lng: value.lng,
        count: value.count,
        categories: Array.from(value.categories),
        severities: value.severities,
        weight: value.count > 10 ? 1 : value.count > 5 ? 0.7 : 0.4,
      });
    });

    res.json({
      success: true,
      data: {
        points: heatmapData,
        clusters: clusterData,
        total: heatmapData.length,
        period: `${days} days`,
        filters: { category, severity },
      },
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

// Get detailed analytics for a specific time period
exports.getDetailedAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, department, category } = req.query;

    const filter = {};
    if (startDate) {
      filter.reportedAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      filter.reportedAt = { ...filter.reportedAt, $lte: new Date(endDate) };
    }
    if (department && department !== 'all') {
      filter.department = department;
    }
    if (category && category !== 'all') {
      filter['aiAnalysis.category'] = category;
    }

    // Get complaints in date range
    const complaints = await Complaint.find(filter)
      .select('reportedAt resolvedAt status aiAnalysis.category aiAnalysis.severity department');

    // Calculate metrics
    const total = complaints.length;
    const verified = complaints.filter(c => c.status === 'verified').length;
    const rejected = complaints.filter(c => c.status === 'rejected').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const pending = complaints.filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status)).length;

    // Calculate average resolution time
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved' && c.resolvedAt);
    let avgResolutionTime = 0;
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((sum, c) => {
        return sum + ((c.resolvedAt - c.reportedAt) / (1000 * 60 * 60));
      }, 0);
      avgResolutionTime = totalTime / resolvedComplaints.length;
    }

    // Category breakdown
    const categoryBreakdown = {};
    complaints.forEach(c => {
      const cat = c.aiAnalysis.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = 0;
      categoryBreakdown[cat] += 1;
    });

    // Department breakdown
    const departmentBreakdown = {};
    complaints.forEach(c => {
      const dept = c.department || 'other';
      if (!departmentBreakdown[dept]) departmentBreakdown[dept] = 0;
      departmentBreakdown[dept] += 1;
    });

    // Hourly distribution (to find peak complaint times)
    const hourlyDistribution = {};
    complaints.forEach(c => {
      const hour = c.reportedAt.getHours();
      const key = `${hour}:00`;
      if (!hourlyDistribution[key]) hourlyDistribution[key] = 0;
      hourlyDistribution[key] += 1;
    });

    // Day of week distribution
    const dayDistribution = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    complaints.forEach(c => {
      const day = days[c.reportedAt.getDay()];
      if (!dayDistribution[day]) dayDistribution[day] = 0;
      dayDistribution[day] += 1;
    });

    res.json({
      success: true,
      data: {
        summary: {
          total,
          verified,
          rejected,
          resolved,
          pending,
          resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
          avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
        },
        breakdowns: {
          categories: categoryBreakdown,
          departments: departmentBreakdown,
          hourly: hourlyDistribution,
          daily: dayDistribution,
        },
        filters: { startDate, endDate, department, category },
        generatedAt: formatToIST(new Date()),
      },
    });

  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get department performance metrics
exports.getDepartmentPerformance = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const departments = ['roads', 'sanitation', 'electricity', 'water', 'other'];

    const performanceData = await Promise.all(departments.map(async (dept) => {
      const complaints = await Complaint.find({
        department: dept,
        reportedAt: { $gte: startDate },
      });

      const total = complaints.length;
      const resolved = complaints.filter(c => c.status === 'resolved').length;
      const verified = complaints.filter(c => c.status === 'verified').length;
      const rejected = complaints.filter(c => c.status === 'rejected').length;

      // Calculate average resolution time for this department
      const resolvedComplaints = complaints.filter(c => c.status === 'resolved' && c.resolvedAt);
      let avgTime = 0;
      if (resolvedComplaints.length > 0) {
        const totalTime = resolvedComplaints.reduce((sum, c) => {
          return sum + ((c.resolvedAt - c.reportedAt) / (1000 * 60 * 60));
        }, 0);
        avgTime = totalTime / resolvedComplaints.length;
      }

      return {
        department: dept,
        displayName: dept.charAt(0).toUpperCase() + dept.slice(1),
        total,
        resolved,
        verified,
        rejected,
        pending: total - resolved - rejected,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
        avgResolutionTime: Math.round(avgTime * 100) / 100,
      };
    }));

    // Sort by total complaints
    performanceData.sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        departments: performanceData,
        period: `${days} days`,
        totalAcrossDepartments: performanceData.reduce((sum, d) => sum + d.total, 0),
      },
    });

  } catch (error) {
    console.error('Error fetching department performance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Manual update analytics (for testing)
exports.manualUpdateAnalytics = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get all complaints for this date
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const complaints = await Complaint.find({
      reportedAt: { $gte: targetDate, $lt: nextDay },
    });

    if (complaints.length === 0) {
      return res.json({
        success: true,
        message: 'No complaints found for this date',
        date: targetDate.toISOString().split('T')[0],
      });
    }

    // Calculate analytics
    const analytics = {
      date: targetDate,
      totalComplaints: complaints.length,
      verifiedComplaints: complaints.filter(c => c.status === 'verified').length,
      rejectedComplaints: complaints.filter(c => c.status === 'rejected').length,
      resolvedComplaints: complaints.filter(c => c.status === 'resolved').length,
      byCategory: {
        pothole: 0,
        garbage: 0,
        streetlight: 0,
        water_leakage: 0,
        road_damage: 0,
        other: 0,
      },
      byDepartment: {
        roads: 0,
        sanitation: 0,
        electricity: 0,
        water: 0,
        other: 0,
      },
      averageResolutionTime: 0,
    };

    complaints.forEach(c => {
      const category = c.aiAnalysis.category || 'other';
      if (analytics.byCategory[category] !== undefined) {
        analytics.byCategory[category] += 1;
      } else {
        analytics.byCategory.other += 1;
      }

      const department = c.department || 'other';
      if (analytics.byDepartment[department] !== undefined) {
        analytics.byDepartment[department] += 1;
      } else {
        analytics.byDepartment.other += 1;
      }
    });

    // Calculate average resolution time
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved' && c.resolvedAt);
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((sum, c) => {
        return sum + ((c.resolvedAt - c.reportedAt) / (1000 * 60 * 60));
      }, 0);
      analytics.averageResolutionTime = totalTime / resolvedComplaints.length;
    }

    // Save or update analytics
    await Analytics.findOneAndUpdate(
      { date: targetDate },
      analytics,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Analytics updated successfully',
      data: {
        analytics,
        date: targetDate.toISOString().split('T')[0],
        complaintsProcessed: complaints.length,
      },
    });

  } catch (error) {
    console.error('Error updating analytics manually:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};