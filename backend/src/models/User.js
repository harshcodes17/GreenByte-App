const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'GreenByte User'
    },
    role: {
      type: String,
      enum: ['customer', 'recycler', 'admin'],
      default: 'customer',
      index: true
    },
    password: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    organizationName: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    authOtp: {
      code: {
        type: String,
        default: ''
      },
      expiresAt: {
        type: Date,
        default: null
      },
      lastIssuedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $ne: '' } }
  }
);

module.exports = mongoose.model('User', userSchema);
