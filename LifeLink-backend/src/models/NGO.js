// src/models/NGO.js - NGO Schema
import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Organization name
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Primary phone
    phone: {
      type: String,
      default: null,
    },
    // Store plain password as requested (note: this is insecure)
    password: {
      type: String,
      required: true,
    },
    // NGO specific fields
    ngo_contact_phone: {
      type: String,
      default: '',
    },
    registered_office_address: {
      type: String,
      default: '',
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    location: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      full_address: { type: String, default: '' },
      country: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Ensure one document per user where applicable
ngoSchema.index({ userId: 1 }, { unique: true, sparse: true });
export default mongoose.model('NGO', ngoSchema);
