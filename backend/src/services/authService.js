const ApiError = require('../utils/apiError');
const User = require('../models/User');
const RecyclerProfile = require('../models/RecyclerProfile');
const bcrypt = require('bcryptjs');

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Constant admin credentials
const ADMIN_PHONE = '0000000000'; // Using a distinct number to avoid collisions
const ADMIN_PASSWORD = 'admin_secret_password';

async function registerUser(payload) {
  if (payload.role === 'admin') {
    throw new ApiError(403, 'Admin registration is disabled');
  }
  const normalizedPhone = payload.phone.replace(/\D/g, '');
  
  // Prevent registration with the admin phone number
  if (normalizedPhone === ADMIN_PHONE) {
    throw new ApiError(403, 'This phone number is reserved for system administration');
  }

  const existingUser = await User.findOne({ phone: normalizedPhone });
  if (existingUser) {
    throw new ApiError(409, 'A user with this phone number already exists');
  }

  if ((payload.role === 'recycler' || payload.role === 'admin') && !payload.password) {
    throw new ApiError(400, `Password is required for ${payload.role} registration`);
  }

  let hashedPassword = '';
  if (payload.password) {
    hashedPassword = await bcrypt.hash(payload.password, 10);
  }

  const user = await User.create({
    name: payload.name,
    phone: normalizedPhone,
    password: hashedPassword,
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

async function loginWithPhone({ phone, role, password }) {
  const normalizedPhone = phone.replace(/\D/g, '');

  // Special case for Admin with constant credentials
  if (role === 'admin' && normalizedPhone === ADMIN_PHONE) {
    if (password === ADMIN_PASSWORD) {
      // Find or create the system admin
      let adminUser = await User.findOne({ phone: ADMIN_PHONE });
      if (!adminUser) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        adminUser = await User.create({
          name: 'System Admin',
          phone: ADMIN_PHONE,
          password: hashedPassword,
          role: 'admin',
          isVerified: true
        });
      } else if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
      }
      return adminUser;
    } else {
      throw new ApiError(401, 'Invalid admin password');
    }
  }

  const user = await User.findOne({ phone: normalizedPhone, role });

  if (!user) {
    throw new ApiError(404, `No ${role} account found for this phone number`);
  }

  if (password && user.password) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid password');
    }
    return user;
  }

  if (role === 'admin' || role === 'recycler') {
    if (!password) {
      throw new ApiError(400, 'Password is required to login');
    }
    throw new ApiError(401, 'Invalid password');
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
