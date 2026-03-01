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
    // Razorpay linked account id for transfers (store only the linked account id, not bank details)
    razorpayAccountId: { type: String, default: '' },
    // New payment-related contact fields (stored on server only)
    razorpayLinkedAccountId: { type: String, default: '' },
    bankAccountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    upiId: { type: String, default: '' },
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
    // Store recent matched donor snapshots for hospital staff reference
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
hospitalSchema.virtual('organizationName')
  .get(function () { return this.name })
  .set(function (v) { this.name = v })

hospitalSchema.virtual('hospitalContactPhone')
  .get(function () { return this.contact_phone })
  .set(function (v) { this.contact_phone = v })

hospitalSchema.virtual('hospitalFullAddress')
  .get(function () { return this.address })
  .set(function (v) { this.address = v })

hospitalSchema.set('toJSON', { virtuals: true })
hospitalSchema.set('toObject', { virtuals: true })

export default mongoose.model('Hospital', hospitalSchema);
