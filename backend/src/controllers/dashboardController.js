const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const ApiError = require('../utils/apiError');
const { userIdParamsSchema } = require('../validators/userValidators');
const { getLatestSystemSnapshot, getUserDashboard } = require('../services/analyticsService');

const getDashboard = asyncHandler(async (req, res) => {
  const { userId } = validate(userIdParamsSchema, req.params);
  const [systemSnapshot, userDashboard] = await Promise.all([
    getLatestSystemSnapshot(),
    getUserDashboard(userId)
  ]);

  if (!userDashboard) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: {
      user: userDashboard,
      system: systemSnapshot
    }
  });
});

module.exports = {
  getDashboard
};
