const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Call Python AI service to fully analyze a complaint.
 * Returns category, severity, keywords, validity.
 * No fallback — if AI fails, complaint fails.
 */
exports.analyzeComplaint = async ({ description, imageUrl, location }) => {
  try {
    console.log('Calling AI service...');

    const response = await axios.post(
      `${AI_SERVICE_URL}/analyze`,
      { imageUrl, description },
      { timeout: 60000 }
    );

    const data = response.data;

    console.log(`Category: ${data.category} | Severity: ${data.severity} | Valid: ${data.isValid}`);

    // Map Python response to Node.js schema
    return {
      isValid: data.isValid,
      category: data.category,
      confidence: data.imageConfidence,
      severity: data.severity,
      descriptionAnalysis: {
        sentiment: data.sentiment,
        keywords: data.keywords,
      },
      // Extra fields for analytics/future use
      severityScore: data.severityScore,
      imageScores: data.imageScores,
      textCategory: data.textCategory,
      urgencyScore: data.urgencyScore,
    };
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