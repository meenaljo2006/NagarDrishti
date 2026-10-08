const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.get('/complaints', complaintController.getComplaints);
router.get('/complaints/:id', complaintController.getComplaintById);

module.exports = router;