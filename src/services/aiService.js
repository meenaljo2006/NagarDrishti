const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Call Python AI service to analyze complaint.
 * NO fallback — if AI fails, complaint fails.
 */
exports.analyzeComplaint = async ({ description, imageUrl, location }) => {
  try {
    console.log('Calling AI service...');

    // 1. Image classification (CLIP)
    const imageResponse = await axios.post(
      `${AI_SERVICE_URL}/classify-image`,
      { imageUrl },
      { timeout: 30000 }
    );

    // 2. Text analysis
    const textResponse = await axios.post(
      `${AI_SERVICE_URL}/analyze-text`,
      { description },
      { timeout: 10000 }
    );

    const imageResult = imageResponse.data;
    const textResult = textResponse.data;

    console.log(`CLIP: ${imageResult.category} (${imageResult.confidence})`);

    // 3. Combine results
    const aiResult = {
      isValid: imageResult.confidence > 0.3,
      category: imageResult.category,
      confidence: imageResult.confidence,
      severity: textResult.severity,
      descriptionAnalysis: {
        sentiment: 'neutral',
        keywords: textResult.keywords,
      },
    };

    console.log('AI analysis complete');
    return aiResult;
  } catch (error) {
    console.error('AI service error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
};

// Map AI category to department
exports.getDepartmentForCategory = (category) => {
  const mapping = {
    pothole: 'roads',
    garbage: 'sanitation',
    water_leakage: 'water',
    other: 'other',
  };
  return mapping[category] || 'other';
};

// Calculate priority from severity
exports.calculatePriority = (severity) => {
  const mapping = { high: 5, medium: 3, low: 1 };
  return mapping[severity] || 3;
};