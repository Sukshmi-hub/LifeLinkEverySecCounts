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
      full_address: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    address: {
      type: String,
      default: ''
    },
    emergency_contact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    willing_organs: {
      type: [String],
      default: [],
    },
    // Link donor to a chosen hospital (if donor selected one during intent/registration)
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    // Certificates issued to this donor
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }],
    certificateStatus: { type: String, default: '' },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
// Virtual aliases to match frontend field names
donorSchema.virtual('fullName')
  .get(function () { return this.name })
  .set(function (v) { this.name = v })

donorSchema.virtual('bloodGroup')
  .get(function () { return this.blood_type })
  .set(function (v) { this.blood_type = v })

donorSchema.virtual('aadhaarNumber')
  .get(function () { return this.aadhaar_no })
  .set(function (v) { this.aadhaar_no = v })

donorSchema.virtual('emergencyContactName')
  .get(function () { return this.emergency_contact?.name })
  .set(function (v) { this.emergency_contact = this.emergency_contact || {}; this.emergency_contact.name = v })

donorSchema.virtual('emergencyPhone')
  .get(function () { return this.emergency_contact?.phone })
  .set(function (v) { this.emergency_contact = this.emergency_contact || {}; this.emergency_contact.phone = v })

donorSchema.set('toJSON', { virtuals: true })
donorSchema.set('toObject', { virtuals: true })

export default mongoose.model('Donor', donorSchema);
