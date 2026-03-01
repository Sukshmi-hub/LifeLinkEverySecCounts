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
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
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
      full_address: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'deceased'],
      default: 'active',
    },
    // Keep a small history of matched donors for quick lookup in patient UI
    matchedDonors: {
      type: [{
        requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
        donor: { type: mongoose.Schema.Types.Mixed },
        matchedAt: { type: Date }
      }],
      default: []
    },
  },
  { timestamps: true }
);
// Virtual aliases to match frontend field names
patientSchema.virtual('fullName')
  .get(function () { return this.name })
  .set(function (v) { this.name = v })

patientSchema.virtual('bloodGroup')
  .get(function () { return this.blood_type })
  .set(function (v) { this.blood_type = v })

patientSchema.virtual('aadhaarNumber')
  .get(function () { return this.aadhaar_no })
  .set(function (v) { this.aadhaar_no = v })

patientSchema.virtual('hospitalAdmittedIn')
  .get(function () { return this.hospital })
  .set(function (v) { this.hospital = v })

patientSchema.virtual('emergencyContactName')
  .get(function () { return this.emergency_contact?.name })
  .set(function (v) { this.emergency_contact = this.emergency_contact || {}; this.emergency_contact.name = v })

patientSchema.virtual('emergencyPhone')
  .get(function () { return this.emergency_contact?.phone })
  .set(function (v) { this.emergency_contact = this.emergency_contact || {}; this.emergency_contact.phone = v })

// Ensure virtuals are included when converting to JSON/Object
patientSchema.set('toJSON', { virtuals: true })
patientSchema.set('toObject', { virtuals: true })

export default mongoose.model('Patient', patientSchema);
