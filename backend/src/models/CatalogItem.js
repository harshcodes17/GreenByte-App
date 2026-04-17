const mongoose = require('mongoose');

const catalogItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['pc', 'kg'],
      required: true
    },
    approximateWeightKg: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

catalogItemSchema.index({ category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CatalogItem', catalogItemSchema);
