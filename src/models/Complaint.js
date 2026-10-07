const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // Citizen info
    citizenName: {
      type: String,
      required: true,
    },
    citizenPhone: {
      type: String,
      required: true,
    },

    // Complaint details
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
      default: 'Location not provided',
    },

    // Image
    imageUrl: {
      type: String,
      required: true,
    },

    // AI Analysis
    aiAnalysis: {
      isValid: { type: Boolean, default: false },
      category: {
        type: String,
        enum: ['pothole', 'garbage', 'streetlight', 'water_leakage', 'road_damage', 'other'],
        default: 'other',
      },
      confidence: { type: Number, min: 0, max: 1, default: 0 },
      severity: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
      },
      descriptionAnalysis: {
        sentiment: { type: String, default: 'neutral' },
        keywords: { type: [String], default: [] },
      },
      duplicateOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        default: null,
      },
    },

    // Status & routing
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
    department: {
      type: String,
      enum: ['roads', 'sanitation', 'electricity', 'water', 'other', null],
      default: null,
    },
    assignedTo: {
      type: String,
      default: null,
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    // Tracking
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // WhatsApp tracking
    whatsappMessageSid: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for location-based queries
complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1, reportedAt: -1 });
complaintSchema.index({ department: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);