const { parseIncomingMessage, sendWhatsAppMessage } = require('../services/whatsappService');
const { getSession, updateSession, clearSession } = require('../utils/sessionManager');
const complaintController = require('./complaintController');

// Check if text looks like a valid description
const isValidDescription = (text) => {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();

  if (cleaned.length < 10) return false;
  if (cleaned.split(/\s+/).length < 2) return false;

  const offTopic = [
    'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'thanks',
    'thank you', 'how are you', 'what', 'who', 'hmm', 'test',
    'start', 'help', 'menu', 'cancel',
  ];
  if (offTopic.includes(cleaned)) return false;

  return true;
};

exports.handleWebhook = async (req, res) => {
  try {
    console.log('\nIncoming WhatsApp webhook');
    const parsed = parseIncomingMessage(req.body);

    if (!parsed || !parsed.citizenPhone) {
      return res.status(200).send('<Response></Response>');
    }

    const phone = parsed.citizenPhone;
    const session = getSession(phone);

    const hasImage = !!parsed.imageUrl;
    const hasText = !!parsed.description && parsed.description.trim().length > 0;
    const hasLocation = !!parsed.location;

    console.log(`   Step: ${session.step} | Image: ${hasImage}, Text: ${hasText}, Loc: ${hasLocation}`);

    // STEP 1: Awaiting Photo
    if (session.step === 'awaiting_photo') {
      // Photo required
      if (!hasImage) {
        await sendWhatsAppMessage(
          phone,
          `Welcome to *NagarDrishti*!\n_See. Verify. Resolve._\n\nTo report a civic issue, send:\n\n 1. A *photo*\n 2. A *description*\n 3. Your *location*\n\nLet's start — please send a *photo* of the issue.`
        );
        return res.status(200).send('<Response></Response>');
      }

      // Photo received
      if (hasText && isValidDescription(parsed.description)) {
        // Photo + valid description together → skip to location
        updateSession(phone, {
          step: 'awaiting_location',
          data: {
            ...session.data,
            imageUrl: parsed.imageUrl,
            description: parsed.description,
          },
        });

        await sendWhatsAppMessage(
          phone,
          `Photo and description received!\n\n Now send your *location*.\n\nTap → Location → Send current location.`
        );
      } else {
        // Photo only → need description
        updateSession(phone, {
          step: 'awaiting_description',
          data: { ...session.data, imageUrl: parsed.imageUrl },
        });

        await sendWhatsAppMessage(
          phone,
          `Photo received!\n\nNow send a *description* of the issue.\nExample: "Big pothole on MG Road"`
        );
      }
      return res.status(200).send('<Response></Response>');
    }

    // STEP 2: Awaiting Description
    if (session.step === 'awaiting_description') {
      // Valid description received
      if (hasText && isValidDescription(parsed.description)) {
        updateSession(phone, {
          step: 'awaiting_location',
          data: {
            ...session.data,
            imageUrl: hasImage ? parsed.imageUrl : session.data.imageUrl,
            description: parsed.description,
          },
        });

        await sendWhatsAppMessage(
          phone,
          `Description received!\n\n Now send your *location*.\n\nTap → Location → Send current location.`
        );
        return res.status(200).send('<Response></Response>');
      }

      // Photo sent again without text
      if (hasImage && !hasText) {
        await sendWhatsAppMessage(
          phone,
          `Photo saved!\n\n Please send a *description* of the issue.\n\nExample: "Big pothole on MG Road"`
        );
        return res.status(200).send('<Response></Response>');
      }

      // Invalid text
      await sendWhatsAppMessage(
        phone,
        `I couldn't understand that as a description.\n\nPlease describe the issue clearly (at least 2 words).\n\nExample: "Big pothole on MG Road"`
      );
      return res.status(200).send('<Response></Response>');
    }

    // STEP 3: Awaiting Location
    if (session.step === 'awaiting_location') {
      if (hasLocation) {
        const complaintData = {
          citizenName: parsed.citizenName,
          citizenPhone: phone,
          description: session.data.description,
          imageUrl: session.data.imageUrl,
          location: parsed.location,
          address: parsed.address || 'Location not provided',
          whatsappMessageSid: parsed.whatsappMessageSid,
        };

        console.log('All 3 items collected. Registering complaint...');
        await complaintController.createComplaint(complaintData);

        clearSession(phone);
        return res.status(200).send('<Response></Response>');
      }

      await sendWhatsAppMessage(
        phone,
        `Please share your *location*.\n\nTap → Location → Send current location.`
      );
      return res.status(200).send('<Response></Response>');
    }

    // Fallback
    clearSession(phone);
    await sendWhatsAppMessage(
      phone,
      `Let's start fresh. Send a *photo* of the issue to begin.`
    );
    return res.status(200).send('<Response></Response>');

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('<Response></Response>');
  }
};