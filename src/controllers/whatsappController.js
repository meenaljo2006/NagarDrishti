const { parseIncomingMessage, sendWhatsAppMessage } = require('../services/whatsappService');
const complaintController = require('./complaintController');

/**
 * Handle incoming WhatsApp messages from Twilio
 * Twilio sends POST requests with form-data
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('\nIncoming WhatsApp webhook');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const parsed = parseIncomingMessage(req.body);

    // If no image, send help message
    if (!parsed.imageUrl) {
      await sendWhatsAppMessage(
        parsed.citizenPhone,
        `👋 *Welcome to NagarDrishti!*\n\nTo report a civic issue:\n\n 1. Send a clear photo\n 2. Share your location\n 3. Describe the problem\n\nExample: "Big pothole on MG Road" with photo & location.\n\nWe'll verify and route to the right department.`
      );
      return res.status(200).send('<Response></Response>');
    }

    // Create complaint from WhatsApp data
    await complaintController.createComplaint(parsed);

    // Respond to Twilio with empty TwiML
    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Webhook error:', error);
    // Always respond 200 to Twilio to prevent retries
    res.status(200).send('<Response></Response>');
  }
};