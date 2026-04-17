const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const { userIdParamsSchema, updateProfileSchema } = require('../validators/userValidators');
const { getUserById, updateUser } = require('../services/userService');

const getProfile = asyncHandler(async (req, res) => {
  const { userId } = validate(userIdParamsSchema, req.params);
  const user = await getUserById(userId);

  res.json({
    success: true,
    data: user
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = validate(userIdParamsSchema, req.params);
  const updates = validate(updateProfileSchema, req.body);
  const user = await updateUser(userId, updates);

  res.json({
    success: true,
    data: user
  });
});

module.exports = {
  getProfile,
  updateProfile
};
