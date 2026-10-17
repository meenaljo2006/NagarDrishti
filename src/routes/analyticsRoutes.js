const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/super-admin', restrictTo('super_admin'), analyticsController.getSuperAdminStats);
router.get('/dept-admin', restrictTo('dept_admin'), analyticsController.getDeptAdminStats);
router.get('/heatmap', restrictTo('super_admin', 'dept_admin'), analyticsController.getHeatmapData);

module.exports = router;