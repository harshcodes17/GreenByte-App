const { z } = require('zod');

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid MongoDB id');

const redeemRewardSchema = z.object({
  userId: objectIdSchema,
  rewardId: objectIdSchema
});

const dashboardParamsSchema = z.object({
  userId: objectIdSchema
});

module.exports = {
  redeemRewardSchema,
  dashboardParamsSchema
};
