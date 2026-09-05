const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

// Complaint routes
router.post('/complaints', complaintController.createComplaint);
router.get('/complaints', complaintController.getComplaints);
router.get('/complaints/:id', complaintController.getComplaintById);
router.put('/complaints/:id/status', complaintController.updateComplaintStatus);

module.exports = router;