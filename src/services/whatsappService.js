const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const CONTENT_SID = process.env.TWILIO_CONTENT_SID;

// Send a WhatsApp message
exports.sendWhatsAppMessage = async (to, message) => {
  const formattedTo = to.startsWith('+') ? to : `+${to}`;

  try {
    const response = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${formattedTo}`,
      contentSid: CONTENT_SID,
      contentVariables: JSON.stringify({
        1: message, // {{1}} in our template = the status text
      }),
    });

    console.log(`WhatsApp sent to ${formattedTo} (SID: ${response.sid})`);
    return response;
  } catch (error) {
    console.error('\nTwilio reply failed');
    console.error(`   Error: ${error.code} - ${error.message}`);
    console.log('\n [LOG-ONLY] Intended message:');
    console.log('─'.repeat(60));
    console.log(message);
    console.log('─'.repeat(60));
    return null;
  }
};

// Parse incoming WhatsApp webhook payload from Twilio
exports.parseIncomingMessage = (body) => {
  if (!body) {
    console.error('Body is undefined');
    return null;
  }

  const {
    From,
    Body: text,
    MediaUrl0: mediaUrl,
    MediaContentType0: mediaType,
    MessageSid,
    ProfileName,
    Latitude,
    Longitude,
    Address,
  } = body;

  const citizenPhone = From ? From.replace('whatsapp:', '') : null;

  let location = null;
  if (Latitude && Longitude) {
    location = {
      type: 'Point',
      coordinates: [parseFloat(Longitude), parseFloat(Latitude)],
    };
  }

  return {
    citizenName: ProfileName || 'Citizen',
    citizenPhone,
    description: text || '',
    imageUrl: mediaUrl || null,
    imageType: mediaType || null,
    location,
    address: Address || 'Location not provided',
    whatsappMessageSid: MessageSid,
  };
};