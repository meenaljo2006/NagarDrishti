/**
 * Simple rule-based AI for complaint analysis.
 * Will be replaced with real YOLOv8 + Hugging Face in Phase 4.
 */

exports.analyzeComplaint = async ({ description, imageUrl, location }) => {
  const text = (description || '').toLowerCase();

  // Category detection based on keywords
  let category = 'other';
  let confidence = 0.6;

  if (/(pothole|gaddha|hole|pit)/i.test(text)) {
    category = 'pothole';
    confidence = 0.85;
  } else if (/(garbage|kuda|trash|waste|dump|kachra)/i.test(text)) {
    category = 'garbage';
    confidence = 0.85;
  } else if (/(streetlight|light|bulb|lamp)/i.test(text)) {
    category = 'streetlight';
    confidence = 0.8;
  } else if (/(water|leak|leakage|pipe|paani)/i.test(text)) {
    category = 'water_leakage';
    confidence = 0.8;
  } else if (/(road|sadak|broken|damage|crater)/i.test(text)) {
    category = 'road_damage';
    confidence = 0.8;
  }

  // Severity detection
  let severity = 'medium';
  if (/(urgent|emergency|dangerous|accident|serious|immediately)/i.test(text)) {
    severity = 'high';
  } else if (/(minor|small|little|not urgent)/i.test(text)) {
    severity = 'low';
  }

  // If image is provided, boost confidence
  if (imageUrl) {
    confidence = Math.min(confidence + 0.1, 0.95);
  }

  return {
    isValid: !!imageUrl, // Require image for validity
    category,
    confidence,
    severity,
    descriptionAnalysis: {
      sentiment: 'negative',
      keywords: text.split(' ').slice(0, 5),
    },
    isDuplicate: false,
    duplicateOf: null,
  };
};

// Map AI category to department
exports.getDepartmentForCategory = (category) => {
  const mapping = {
    pothole: 'roads',
    road_damage: 'roads',
    garbage: 'sanitation',
    streetlight: 'electricity',
    water_leakage: 'water',
  };
  return mapping[category] || 'other';
};

// Calculate priority from severity
exports.calculatePriority = (severity) => {
  const mapping = { high: 5, medium: 3, low: 1 };
  return mapping[severity] || 3;
};