// src/models/Patient.js - Patient Schema
import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // unique: true, // allow multiple patients per userId if needed
    },
    // Duplicate some user info here for easy queries from patient collection
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
      // unique: true, // allow duplicate aadhaar_no if needed
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
    // medical_id field removed to allow multiple entries
    health_conditions: {
      type: [String],
      default: [],
    },
    emergency_contact: {
      name: String,
      phone: String,
      relationship: String,
    },
    location: {
      city: String,
      state: String,
      latitude: Number,
      longitude: Number,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'deceased'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Patient', patientSchema);
