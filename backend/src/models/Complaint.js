const mongoose = require('mongoose');

// ============================================
// HELPER: Get Current IST Time
// ============================================
const getISTTime = () => {
  return new Date();
};

const complaintSchema = new mongoose.Schema({
  // Citizen Information
  citizenName: {
    type: String,
    required: [true, 'Citizen name is required'],
    trim: true,
  },
  citizenPhone: {
    type: String,
    required: [true, 'Citizen phone is required'],
    trim: true,
  },
  
  // Complaint Details
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required'],
    },
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  
  // Image
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
  },
  imagePublicId: {
    type: String,
  },
  
  // AI Analysis Results
  aiAnalysis: {
    isValid: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['pothole', 'garbage', 'streetlight', 'water_leakage', 'road_damage', 'other'],
      default: 'other',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    descriptionAnalysis: {
      sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral',
      },
      keywords: {
        type: [String],
        default: [],
      },
      wordCount: {
        type: Number,
        default: 0,
      },
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
    },
  },
  
  // Status & Routing
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  },
  department: {
    type: String,
    enum: ['roads', 'sanitation', 'electricity', 'water', 'other'],
  },
  assignedTo: {
    type: String,
    trim: true,
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  
  // ============================================
  // STORE IST TIME DIRECTLY
  // ============================================
  reportedAt: {
    type: Date,
    default: getISTTime,
  },
  reportedAtIST: {
    type: String,  // Store as string in IST format
  },
  resolvedAt: {
    type: Date,
  },
  resolvedAtIST: {
    type: String,
  },
  
  // Tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: getISTTime,
    },
    timestampIST: {
      type: String,
    },
    note: {
      type: String,
      trim: true,
    },
  }],
  
  whatsappMessageSid: {
    type: String,
    trim: true,
  },
  
  isDuplicate: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ============================================
// ❌ NO MIDDLEWARE - Removed to fix error
// ============================================

// ============================================
// INDEXES
// ============================================

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1, reportedAt: -1 });
complaintSchema.index({ 'aiAnalysis.category': 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ reportedAt: -1 });
complaintSchema.index({ citizenPhone: 1 });
complaintSchema.index({ isDuplicate: 1 });
complaintSchema.index({ reportedAtIST: 1 });

// Text search index
complaintSchema.index({
  description: 'text',
  address: 'text',
  citizenName: 'text',
}, {
  weights: {
    description: 10,
    address: 5,
    citizenName: 3,
  },
  name: 'TextSearchIndex',
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Display IST time
complaintSchema.virtual('displayTime').get(function() {
  return this.reportedAtIST || 'N/A';
});

// Time ago
complaintSchema.virtual('timeAgo').get(function() {
  if (!this.reportedAt) return 'N/A';
  const now = new Date();
  const diff = (now - new Date(this.reportedAt)) / 1000;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} weeks ago`;
});

// Display name
complaintSchema.virtual('displayName').get(function() {
  const categories = {
    pothole: '🕳️ Pothole',
    garbage: '🗑️ Garbage',
    streetlight: '💡 Streetlight',
    water_leakage: '💧 Water Leakage',
    road_damage: '🛣️ Road Damage',
    other: '📋 Other',
  };
  return categories[this.aiAnalysis.category] || '📋 Unknown';
});

// Status badge
complaintSchema.virtual('statusBadge').get(function() {
  const statuses = {
    pending: '🟡 Pending',
    verified: '🟢 Verified',
    rejected: '🔴 Rejected',
    assigned: '🔵 Assigned',
    in_progress: '🟠 In Progress',
    resolved: '✅ Resolved',
    closed: '⚫ Closed',
  };
  return statuses[this.status] || '🟡 Pending';
});

// ============================================
// INSTANCE METHODS
// ============================================

complaintSchema.methods.verify = function(note) {
  const now = new Date();
  const istString = now.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  this.status = 'verified';
  this.isVerified = true;
  this.statusHistory.push({
    status: 'verified',
    timestamp: now,
    timestampIST: istString,
    note: note || 'Complaint verified by AI',
  });
  return this.save();
};

complaintSchema.methods.reject = function(note) {
  const now = new Date();
  const istString = now.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  this.status = 'rejected';
  this.isVerified = false;
  this.statusHistory.push({
    status: 'rejected',
    timestamp: now,
    timestampIST: istString,
    note: note || 'Complaint rejected',
  });
  return this.save();
};

complaintSchema.methods.resolve = function(note) {
  const now = new Date();
  const istString = now.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  this.status = 'resolved';
  this.resolvedAt = now;
  this.resolvedAtIST = istString;
  this.statusHistory.push({
    status: 'resolved',
    timestamp: now,
    timestampIST: istString,
    note: note || 'Complaint resolved',
  });
  return this.save();
};

module.exports = mongoose.model('Complaint', complaintSchema);