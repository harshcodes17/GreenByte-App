const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    snapshotDate: {
      type: Date,
      required: true,
      unique: true
    },
    totals: {
      totalUsers: { type: Number, default: 0 },
      totalPickups: { type: Number, default: 0 },
      completedPickups: { type: Number, default: 0 },
      totalEstimatedValue: { type: Number, default: 0 },
      totalWeightKg: { type: Number, default: 0 },
      totalCo2SavedKg: { type: Number, default: 0 },
      totalTreesSaved: { type: Number, default: 0 },
      totalRawMaterialRecoveredKg: { type: Number, default: 0 },
      totalCoinsRedeemed: { type: Number, default: 0 }
    },
    topCategories: [
      {
        category: String,
        quantity: Number
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
