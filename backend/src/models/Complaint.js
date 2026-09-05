const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // Citizen Information
  citizenName: {
    type: String,
    required: true,
  },
  citizenPhone: {
    type: String,
    required: true,
  },
  
  // Complaint Details
  description: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  address: {
    type: String,
    required: true,
  },
  
  // Image
  imageUrl: {
    type: String,
    required: true,
  },
  imagePublicId: {
    type: String, // For cloud storage
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
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    descriptionAnalysis: {
      sentiment: String,
      keywords: [String],
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
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  
  // Timestamps
  reportedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
  
  // Tracking
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String,
  }],
  
  // WhatsApp Message ID for tracking
  whatsappMessageSid: {
    type: String,
  },
}, {
  timestamps: true,
});

// Create geospatial index for location queries
complaintSchema.index({ location: '2dsphere' });

// Create index for faster queries
complaintSchema.index({ status: 1, reportedAt: -1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ department: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);