const ApiError = require('../utils/apiError');
const User = require('../models/User');
const RecyclerProfile = require('../models/RecyclerProfile');

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function registerUser(payload) {
  const normalizedPhone = payload.phone.replace(/\D/g, '');
  const existingUser = await User.findOne({ phone: normalizedPhone });

  if (existingUser) {
    throw new ApiError(409, 'A user with this phone number already exists');
  }

  const user = await User.create({
    name: payload.name,
    phone: normalizedPhone,
    role: payload.role,
    email: payload.email || '',
    address: payload.address || '',
    organizationName: payload.organizationName || '',
    isVerified: payload.role === 'admin'
  });

  if (payload.role === 'recycler') {
    await RecyclerProfile.create({
      user: user._id,
      companyName: payload.organizationName || `${payload.name} Recycling Services`,
      serviceAreas: [],
      collectionPoints: []
    });
  }

  return user;
}

async function loginWithPhone({ phone, role }) {
  const normalizedPhone = phone.replace(/\D/g, '');
  const user = await User.findOne({ phone: normalizedPhone, role });

  if (!user) {
    throw new ApiError(404, `No ${role} account found for this phone number`);
  }

  return user;
}

async function requestLoginOtp({ phone, role }) {
  const user = await loginWithPhone({ phone, role });
  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  user.authOtp = {
    code,
    expiresAt,
    lastIssuedAt: now
  };

  await user.save();

  return {
    user,
    otp: code,
    expiresAt
  };
}

async function verifyLoginOtp({ phone, role, otp }) {
  const normalizedPhone = phone.replace(/\D/g, '');
  const user = await User.findOne({ phone: normalizedPhone, role });

  if (!user) {
    throw new ApiError(404, `No ${role} account found for this phone number`);
  }

  if (!user.authOtp?.code || !user.authOtp?.expiresAt) {
    throw new ApiError(400, 'No OTP has been requested for this account');
  }

  if (user.authOtp.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP');
  }

  if (user.authOtp.code !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  user.authOtp = {
    code: '',
    expiresAt: null,
    lastIssuedAt: user.authOtp.lastIssuedAt || null
  };

  await user.save();

  return user;
}

module.exports = {
  registerUser,
  loginWithPhone,
  requestLoginOtp,
  verifyLoginOtp
};
