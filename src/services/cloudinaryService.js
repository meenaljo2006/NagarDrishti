const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Download image from Twilio (auth required) and upload to Cloudinary.
 * Returns the public Cloudinary URL.
 */
exports.uploadTwilioImageToCloudinary = async (twilioUrl, complaintId) => {
  try {
    console.log('Downloading from Twilio...');
    
    const auth = {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    };

    const response = await axios.get(twilioUrl, {
      auth,
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    console.log('Uploading to Cloudinary...');

    const base64 = Buffer.from(response.data).toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const dataUri = `data:${contentType};base64,${base64}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'nagardrishti',
      public_id: `complaint_${complaintId || Date.now()}`,
      resource_type: 'image',
      overwrite: true,
    });

    console.log(`Uploaded: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    throw error; 
  }
};

/**
 * Upload a file buffer directly to Cloudinary (for field team photo uploads)
 */
exports.uploadBufferToCloudinary = async (fileBuffer, folder = 'nagardrishti/proofs') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary buffer upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};