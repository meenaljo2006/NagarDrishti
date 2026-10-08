const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Twilio WhatsApp webhook
router.post('/whatsapp', whatsappController.handleWebhook);

module.exports = router;