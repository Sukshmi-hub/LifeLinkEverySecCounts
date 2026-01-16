// src/models/Donor.js - Donor Schema
import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // duplicate user info for easy queries
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
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
    aadhaar_no: {
      type: String,
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
    },
    blood_type: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    donation_type: {
      type: [String],
      default: [],
    },
    last_donation_date: {
      type: Date,
      default: null,
    },
    total_donations: {
      type: Number,
      default: 0,
    },
    health_status: {
      type: String,
      enum: ['healthy', 'under_treatment', 'unfit'],
      default: 'healthy',
    },
    location: {
      city: String,
      state: String,
      latitude: Number,
      longitude: Number,
    },
    willing_organs: {
      type: [String],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Donor', donorSchema);
