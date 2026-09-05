// AI Service with proper mock fallback
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.warn('⚠️ Axios not installed, using mock AI service');
  axios = null;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Mock AI response with intelligent analysis
const mockAIResponse = (data) => {
  console.log('🤖 Using MOCK AI Service (Intelligent Mode)');
  
  const description = (data.description || '').toLowerCase();
  const imageUrl = data.imageUrl || '';
  
  // Determine category based on description keywords
  let category = 'other';
  let confidence = 0.6;
  
  // Keyword mapping for categories
  const categoryKeywords = {
    pothole: ['pothole', 'crack', 'road damage', 'broken road', 'road repair', 'asphalt', 'craters', 'bumpy road'],
    garbage: ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish', 'bin overflow', 'waste collection'],
    streetlight: ['streetlight', 'light', 'lamp', 'dark', 'illumination', 'pole', 'lighting', 'electric pole'],
    water_leakage: ['water', 'leak', 'pipe', 'drain', 'flood', 'overflow', 'plumbing', 'wet road'],
    road_damage: ['damage', 'broken', 'repair', 'construction', 'barricade', 'dangerous', 'accident']
  };
  
  // Check which category matches best
  let bestMatch = 'other';
  let bestScore = 0;
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }
  
  // If we found a good match
  if (bestScore > 0) {
    category = bestMatch;
    confidence = Math.min(0.7 + (bestScore * 0.05), 0.95);
  } else {
    // Random category for testing
    const categories = ['pothole', 'garbage', 'streetlight', 'water_leakage', 'road_damage'];
    category = categories[Math.floor(Math.random() * categories.length)];
    confidence = 0.65 + Math.random() * 0.25;
  }
  
  // Determine severity based on confidence and description
  let severity = 'medium';
  if (confidence > 0.85) {
    severity = 'high';
  } else if (confidence > 0.7) {
    severity = 'medium';
  } else {
    severity = 'low';
  }
  
  // Extract keywords from description
  const keywords = description
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 5);
  
  return {
    isValid: confidence > 0.6,
    category: category,
    confidence: confidence,
    severity: severity,
    descriptionAnalysis: {
      sentiment: 'neutral',
      keywords: keywords,
      wordCount: description.split(' ').length,
    },
  };
};

exports.callAIService = async (data) => {
  try {
    // ALWAYS use mock in development (skip real AI call)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Using mock AI');
      return mockAIResponse(data);
    }
    
    // If axios is not available, use mock
    if (!axios) {
      console.log('🤖 Using mock AI (axios not installed)');
      return mockAIResponse(data);
    }

    // Try to call real AI service with timeout
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/analyze`, data, {
        timeout: 3000, // 3 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ AI Service responded successfully');
      return response.data;
    } catch (axiosError) {
      console.log(`⚠️ AI Service not reachable (${axiosError.code}), using mock response`);
      return mockAIResponse(data);
    }
  } catch (error) {
    console.error('AI Service Error:', error.message);
    return mockAIResponse(data);
  }
};