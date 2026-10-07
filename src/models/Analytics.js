const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
      unique: true,
    },
    totalComplaints: { type: Number, default: 0 },
    verifiedComplaints: { type: Number, default: 0 },
    rejectedComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    byCategory: {
      pothole: { type: Number, default: 0 },
      garbage: { type: Number, default: 0 },
      streetlight: { type: Number, default: 0 },
      water_leakage: { type: Number, default: 0 },
      road_damage: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    byDepartment: {
      roads: { type: Number, default: 0 },
      sanitation: { type: Number, default: 0 },
      electricity: { type: Number, default: 0 },
      water: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    averageResolutionTime: { type: Number, default: 0 }, // in hours
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analytics', analyticsSchema);