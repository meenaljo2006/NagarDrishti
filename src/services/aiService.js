const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.analyzeComplaint = async ({ description, imageUrl, location }) => {
  try {
    console.log('Calling AI service...');

    // Call CLIP image classification
    const imageResult = await axios.post(
      `${AI_SERVICE_URL}/classify-image`,
      { imageUrl },
      { timeout: 30000 }
    );

    // Call text analysis
    const textResult = await axios.post(
      `${AI_SERVICE_URL}/analyze-text`,
      { description },
      { timeout: 10000 }
    );

    // Combine results
    const aiResult = {
      isValid: imageResult.data.confidence > 0.3,
      category: imageResult.data.category,
      confidence: imageResult.data.confidence,
      severity: textResult.data.severity,
      descriptionAnalysis: {
        keywords: textResult.data.keywords,
      },
    };

    console.log('AI analysis:', aiResult);
    return aiResult;
  } catch (error) {
    console.error('AI service error:', error.message);
  }
};