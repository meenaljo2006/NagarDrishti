const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Analytics routes
router.get('/analytics/dashboard', analyticsController.getDashboardStats);
router.get('/analytics/heatmap', analyticsController.getHeatmapData);

module.exports = router;