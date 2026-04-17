const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      required: true
    },
    rewardName: {
      type: String,
      required: true
    },
    coinsSpent: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['redeemed'],
      default: 'redeemed'
    }
  },
  {
    timestamps: true
  }
);

rewardRedemptionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema);
