// src/models/User.js - User Schema
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSubSchema = new mongoose.Schema(
  {
    codeHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      default: null,
    },
    aadhaar_no: {
      type: String,
      // Aadhaar is required only for certain roles (patient/donor).
      // Make it optional on the User model so hospital/ngo/admin can register without it.
      // Do NOT default to null here: storing `null` would be indexed and break uniqueness.
    },
    role: {
      type: String,
      enum: ['patient', 'donor', 'hospital', 'ngo', 'admin'],
      required: [true, 'Please specify a role'],
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'blocked'],
      default: 'active',
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verification_token: {
      type: String,
      default: null,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    emailVerification: {
      type: otpSubSchema,
      default: () => ({}),
    },
    passwordReset: {
      type: otpSubSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is new or modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Ensure unique index on aadhaar_no is sparse so multiple docs without aadhaar are allowed
userSchema.index({ aadhaar_no: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);