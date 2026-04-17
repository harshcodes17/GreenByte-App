const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const {
  loginSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema
} = require('../validators/authValidators');
const {
  loginWithPhone,
  registerUser,
  requestLoginOtp,
  verifyLoginOtp
} = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const payload = validate(registerSchema, req.body);
  const user = await registerUser(payload);

  res.status(201).json({
    success: true,
    data: user
  });
});

const login = asyncHandler(async (req, res) => {
  const payload = validate(loginSchema, req.body);
  const user = await loginWithPhone(payload);

  res.status(200).json({
    success: true,
    data: user
  });
});

const requestOtp = asyncHandler(async (req, res) => {
  const payload = validate(requestOtpSchema, req.body);
  const result = await requestLoginOtp(payload);

  res.status(200).json({
    success: true,
    message: 'OTP generated successfully',
    data: {
      userId: result.user._id,
      role: result.user.role,
      phone: result.user.phone,
      expiresAt: result.expiresAt,
      demoOtp: result.otp
    }
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const payload = validate(verifyOtpSchema, req.body);
  const user = await verifyLoginOtp(payload);

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    data: user
  });
});

module.exports = {
  register,
  login,
  requestOtp,
  verifyOtp
};
