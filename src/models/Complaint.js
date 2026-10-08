const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // === Citizen Info ===
    citizenName: { type: String, required: true },
    citizenPhone: { type: String, required: true, index: true },

    // === Complaint Details ===
    description: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: { type: String, default: 'Location not provided' },
    imageUrl: { type: String, required: true },

    // === Quick-Access Category ===
    category: {
      type: String,
      enum: ['pothole', 'garbage', 'streetlight', 'water_leakage', 'road_damage', 'other'],
      default: 'other',
      index: true,
    },

    // === AI Analysis ===
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
      keywords: { type: [String], default: [] },
      duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
    },

    // === Lifecycle ===
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
      index: true,
    },
    department: {
      type: String,
      enum: ['roads', 'sanitation', 'electricity', 'water', 'other', null],
      default: null,
      index: true,
    },
    assignedTo: { type: String, default: null },
    priority: { type: Number, min: 1, max: 5, default: 3 },

    // === Timestamps ===
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolutionNote: { type: String, default: null },

    // === Audit Trail ===
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // === External Reference ===
    whatsappMessageSid: { type: String, default: null },
  },
  { timestamps: true }
);

// Geospatial index for map queries
complaintSchema.index({ location: '2dsphere' });

// Compound indexes for dashboard filters
complaintSchema.index({ status: 1, reportedAt: -1 });
complaintSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);