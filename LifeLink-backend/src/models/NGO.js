// src/models/NGO.js - NGO Schema (simplified to match frontend fields)
import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      lowercase: true,
    },
    phone: {
      type: String,
      default: null,
    },
    // Store plain password as requested (note: this is insecure)
    password: {
      type: String,
      required: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create a unique sparse index on userId to avoid duplicate-key errors for legacy documents
ngoSchema.index({ userId: 1 }, { unique: true, sparse: true });

const NGO = mongoose.model('NGO', ngoSchema);
export default NGO;
