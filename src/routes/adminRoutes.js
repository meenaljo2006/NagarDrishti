const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes here require login
router.use(protect);

router.get('/users', restrictTo('super_admin'), adminController.getAllUsers);
router.post('/users', restrictTo('super_admin', 'dept_admin'), adminController.createUser);

// Dept Admin & Super Admin routes
router.use(restrictTo('dept_admin', 'super_admin'));

router.get('/complaints', adminController.getDeptComplaints);
router.get('/field-team', adminController.getFieldTeam);

// Actions on complaints
router.put('/complaints/:id/assign', adminController.assignComplaint);
router.put('/complaints/:id/reject', adminController.rejectComplaint);
router.put('/complaints/:id/close', adminController.closeComplaint);

module.exports = router;