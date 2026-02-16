// src/models/Request.js - Patient organ/fund request schema
import mongoose from 'mongoose'

const requestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientName: { type: String, required: true },
    organType: { type: String, default: '' },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    details: { type: String, default: '' },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    status: { type: String, enum: ['Pending', 'Processing', 'Accepted', 'Donor Matched', 'Cancelled'], default: 'Pending' },
    matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export default mongoose.model('Request', requestSchema)
