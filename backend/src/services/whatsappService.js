const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendWhatsAppMessage = async (to, message) => {
  try {
    // Format phone number (remove any special chars)
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${formattedTo}`,
    });

    console.log(`✅ WhatsApp message sent to ${formattedTo}`);
    return response;
  } catch (error) {
    console.error('WhatsApp Error:', error.message);
    // Don't throw error, just log it
    return null;
  }
};

// Parse incoming WhatsApp message
exports.parseWhatsAppMessage = (body) => {
  try {
    const { 
      From: from,
      Body: text,
      MediaUrl0: mediaUrl,
      MessageSid: messageSid,
    } = body;

    // Extract phone number (remove 'whatsapp:' prefix)
    const phone = from.replace('whatsapp:', '');

    // Try to extract location from text
    let location = null;
    let address = '';
    
    // You can add NLP here to extract location from text
    // For now, return basic info

    return {
      citizenPhone: phone,
      description: text || '',
      imageUrl: mediaUrl || null,
      whatsappMessageSid: messageSid,
      location: location || { coordinates: [0, 0] }, // Default if no location
      address: address || 'Location not provided',
    };
  } catch (error) {
    console.error('WhatsApp Parse Error:', error);
    return null;
  }
};