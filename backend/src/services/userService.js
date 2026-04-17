const ApiError = require('../utils/apiError');
const User = require('../models/User');

async function getUserById(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

async function updateUser(userId, updates) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: updates
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

module.exports = {
  getUserById,
  updateUser
};
