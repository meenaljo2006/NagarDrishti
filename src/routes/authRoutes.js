const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', authController.register); // Later, restrict this to Super Admin only
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;