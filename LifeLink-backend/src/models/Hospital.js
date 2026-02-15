// src/models/Hospital.js - Hospital Schema
import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
        // unique: true, // allow multiple hospitals per userId if needed
    },
    // Only store fields present on the hospital registration form
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
    hospital_type: {
      type: String,
      default: ''
    },
    contact_phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
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

export default mongoose.model('Hospital', hospitalSchema);
