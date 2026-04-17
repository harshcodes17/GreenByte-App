const ApiError = require('../utils/apiError');
const Reward = require('../models/Reward');
const RewardRedemption = require('../models/RewardRedemption');
const User = require('../models/User');

async function listRewards() {
  return Reward.find({ isActive: true }).sort({ coinsRequired: 1 }).lean();
}

async function redeemReward({ userId, rewardId }) {
  const [user, reward] = await Promise.all([User.findById(userId), Reward.findById(rewardId)]);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!reward || !reward.isActive) {
    throw new ApiError(404, 'Reward not found');
  }

  if (user.coinsBalance < reward.coinsRequired) {
    throw new ApiError(400, 'Insufficient coins balance');
  }

  user.coinsBalance -= reward.coinsRequired;
  await user.save();

  const redemption = await RewardRedemption.create({
    user: user._id,
    reward: reward._id,
    rewardName: reward.name,
    coinsSpent: reward.coinsRequired
  });

  return {
    user,
    redemption
  };
}

module.exports = {
  listRewards,
  redeemReward
};
