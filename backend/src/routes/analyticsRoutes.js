const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Analytics routes
router.get('/analytics/dashboard', analyticsController.getDashboardStats);
router.get('/analytics/heatmap', analyticsController.getHeatmapData);
router.get('/analytics/detailed', analyticsController.getDetailedAnalytics);
router.get('/analytics/department-performance', analyticsController.getDepartmentPerformance);
router.post('/analytics/manual-update', analyticsController.manualUpdateAnalytics);

module.exports = router;