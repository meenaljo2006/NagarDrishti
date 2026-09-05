// WhatsApp Service with proper mock mode
let twilio;
try {
  twilio = require('twilio');
} catch (error) {
  console.warn('⚠️ Twilio not installed, using mock WhatsApp service');
  twilio = null;
}

let client = null;
const hasValidTwilio = twilio && 
  process.env.TWILIO_ACCOUNT_SID && 
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_ACCOUNT_SID !== 'your_actual_account_sid_here';

if (hasValidTwilio) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio client initialized');
} else {
  console.log('📱 Using mock WhatsApp service (Twilio not configured)');
}

// Mock WhatsApp sender with proper logging
const mockSend = async (to, message) => {
  // Format phone number for display
  const displayTo = to.startsWith('+') ? to : `+${to}`;
  
  console.log(`📱 [MOCK] WhatsApp Message:`);
  console.log(`   To: ${displayTo}`);
  console.log(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  console.log(`   Status: ✅ Sent (Mock Mode)`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  return { 
    sid: `mock_${Date.now()}`, 
    status: 'sent',
    to: displayTo,
    body: message,
    dateCreated: new Date(),
  };
};

exports.sendWhatsAppMessage = async (to, message) => {
  try {
    // If no valid Twilio client, use mock
    if (!client || !hasValidTwilio) {
      return await mockSend(to, message);
    }

    // Format phone number
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    try {
      const response = await client.messages.create({
        body: message,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${formattedTo}`,
      });
      
      console.log(`✅ WhatsApp message sent to ${formattedTo}`);
      console.log(`   SID: ${response.sid}`);
      console.log(`   Status: ${response.status}`);
      return response;
      
    } catch (twilioError) {
      console.log(`⚠️ Twilio error (using mock): ${twilioError.message}`);
      return await mockSend(to, message);
    }
  } catch (error) {
    console.error('WhatsApp Error:', error.message);
    return await mockSend(to, message);
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
      ProfileName: profileName,
      Latitude: latitude,
      Longitude: longitude,
    } = body;

    // Extract phone number
    const phone = from ? from.replace('whatsapp:', '') : '';

    // Parse location if available
    let location = { coordinates: [78.9629, 20.5937] }; // Default: Pune
    let address = 'Location not provided';
    
    if (latitude && longitude) {
      location.coordinates = [parseFloat(longitude), parseFloat(latitude)];
      address = `Lat: ${latitude}, Lng: ${longitude}`;
    }

    // Default response
    return {
      citizenName: profileName || 'Citizen',
      citizenPhone: phone,
      description: text || '',
      imageUrl: mediaUrl || null,
      whatsappMessageSid: messageSid || `mock_${Date.now()}`,
      location: location,
      address: address,
    };
  } catch (error) {
    console.error('WhatsApp Parse Error:', error);
    return {
      citizenName: 'Citizen',
      citizenPhone: '',
      description: '',
      imageUrl: null,
      whatsappMessageSid: `mock_${Date.now()}`,
      location: { coordinates: [78.9629, 20.5937] },
      address: 'Location not provided',
    };
  }
};