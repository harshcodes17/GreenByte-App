const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const { redeemRewardSchema } = require('../validators/rewardValidators');
const { listRewards, redeemReward } = require('../services/rewardService');

const list = asyncHandler(async (req, res) => {
  const rewards = await listRewards();

  res.json({
    success: true,
    data: rewards
  });
});

const redeem = asyncHandler(async (req, res) => {
  const payload = validate(redeemRewardSchema, req.body);
  const result = await redeemReward(payload);

  res.status(201).json({
    success: true,
    data: result
  });
});

module.exports = {
  list,
  redeem
};
