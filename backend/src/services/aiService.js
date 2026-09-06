// ============================================
// AI SERVICE - Connected to Real AI Service
// ============================================

const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const USE_REAL_AI = process.env.USE_REAL_AI === 'true' || false;

exports.callAIService = async (data) => {
  console.log('🤖 Calling AI Service...');
  console.log(`   URL: ${AI_SERVICE_URL}/analyze`);
  
  // If real AI is disabled, use mock
  if (!USE_REAL_AI) {
    console.log('🔧 Using MOCK AI (USE_REAL_AI=false)');
    return mockAIResponse(data);
  }

  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('imageUrl', data.imageUrl || 'https://example.com/default.jpg');
    formData.append('description', data.description || '');
    if (data.location) {
      formData.append('location', JSON.stringify(data.location));
    }

    // Call AI service
    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    console.log('✅ AI Service responded successfully');
    return response.data;

  } catch (error) {
    console.error('❌ AI Service Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ AI Service not running, using mock response');
    }
    console.log('🔄 Falling back to MOCK AI');
    return mockAIResponse(data);
  }
};

// ============================================
// MOCK AI SERVICE (FALLBACK)
// ============================================

const mockAIResponse = (data) => {
  console.log('🤖 Using MOCK AI Service (Fallback)');
  
  const description = (data.description || '').toLowerCase();
  
  const categoryKeywords = {
    pothole: ['pothole', 'crack', 'road damage', 'broken road', 'asphalt', 'craters'],
    garbage: ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish'],
    streetlight: ['streetlight', 'light', 'lamp', 'dark', 'illumination', 'pole'],
    water_leakage: ['water', 'leak', 'pipe', 'drain', 'flood', 'overflow'],
    road_damage: ['damage', 'broken', 'repair', 'construction', 'barricade']
  };
  
  let bestCategory = 'other';
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  let confidence = 0.5;
  if (bestScore > 0) {
    confidence = Math.min(0.6 + (bestScore * 0.08), 0.95);
  }
  
  let severity = 'medium';
  if (confidence > 0.8) severity = 'high';
  else if (confidence < 0.5) severity = 'low';
  
  return {
    isValid: confidence > 0.4,
    category: bestCategory,
    confidence: confidence,
    severity: severity,
    descriptionAnalysis: {
      sentiment: 'neutral',
      keywords: description.split(' ').filter(w => w.length > 3).slice(0, 5),
      wordCount: description.split(' ').length
    }
  };
};