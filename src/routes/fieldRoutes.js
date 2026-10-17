const express = require('express');
const router = express.Router();
const multer = require('multer');
const fieldController = require('../controllers/fieldController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Configure Multer for memory storage (we pass the buffer to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All routes here require login and must be a field_worker
router.use(protect);
router.use(restrictTo('field_worker'));

router.put('/complaints/:id/start', upload.single('beforeImage'), fieldController.startWork);
router.put('/complaints/:id/resolve', upload.single('afterImage'), fieldController.resolveComplaint);

module.exports = router;