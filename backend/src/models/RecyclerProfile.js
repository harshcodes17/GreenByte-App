const mongoose = require('mongoose');

const recyclerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      trim: true,
      required: true
    },
    serviceAreas: {
      type: [String],
      default: []
    },
    vehicleType: {
      type: String,
      trim: true,
      default: 'pickup-van'
    },
    pickupCapacityPerDay: {
      type: Number,
      default: 10
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available',
      index: true
    },
    collectionPoints: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RecyclerProfile', recyclerProfileSchema);
