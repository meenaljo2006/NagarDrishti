const axios = require('axios');

// AI Service client
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.callAIService = async (data) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, data, {
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('AI Service Error:', error.message);
    
    // Return default response if AI service fails
    return {
      isValid: true,
      category: 'other',
      confidence: 0.5,
      severity: 'medium',
      descriptionAnalysis: {
        sentiment: 'neutral',
        keywords: [],
      },
    };
  }
};