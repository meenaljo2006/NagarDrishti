const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes here require login and must be dept_admin or super_admin
router.use(protect);
router.use(restrictTo('dept_admin', 'super_admin'));

router.get('/complaints', adminController.getDeptComplaints);
router.put('/complaints/:id/assign', adminController.assignComplaint);
router.put('/complaints/:id/close', adminController.closeComplaint);

module.exports = router;