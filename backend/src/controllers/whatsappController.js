const { parseWhatsAppMessage } = require('../services/whatsappService');
const complaintController = require('./complaintController');

exports.handleWhatsAppWebhook = async (req, res) => {
  try {
    // Verify Twilio signature (in production)
    const body = req.body;

    // Check if it's a status callback
    if (body.SmsStatus) {
      console.log('📱 WhatsApp Status Update:', body.SmsStatus);
      return res.status(200).send('OK');
    }

    // Parse the incoming message
    const parsedData = parseWhatsAppMessage(body);
    
    if (!parsedData || !parsedData.imageUrl) {
      // No image provided, send instructions
      await sendWhatsAppMessage(
        parsedData?.citizenPhone || body.From.replace('whatsapp:', ''),
        `📱 Welcome to NagarDrishti!\n\nTo report an issue:\n1. Take a clear photo\n2. Share your location\n3. Describe the problem\n\nExample: "Pothole on MG Road" with photo and location.\n\nWe'll verify and forward to the right department.`
      );
      return res.status(200).send('OK');
    }

    // Extract location from WhatsApp (if shared)
    let location = { coordinates: [0, 0] };
    let address = 'Location shared via WhatsApp';
    
    if (body.Latitude && body.Longitude) {
      location.coordinates = [parseFloat(body.Longitude), parseFloat(body.Latitude)];
      address = `Lat: ${body.Latitude}, Lng: ${body.Longitude}`;
    }

    // Prepare complaint data
    const complaintData = {
      citizenName: body.ProfileName || 'Citizen',
      citizenPhone: parsedData.citizenPhone,
      description: parsedData.description,
      location: location,
      address: address,
      imageUrl: parsedData.imageUrl,
      whatsappMessageSid: parsedData.whatsappMessageSid,
    };

    // Create complaint
    const reqWithData = {
      body: complaintData,
    };
    
    const resWithData = {
      status: (code) => ({
        json: (data) => {
          console.log('✅ Complaint created:', data);
        },
      }),
    };

    await complaintController.createComplaint(reqWithData, resWithData);

    // Send acknowledgment (already sent in controller)
    res.status(200).send('OK');

  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
};