import mongoose from 'mongoose';

const { Schema } = mongoose;

const RequestSchema = new Schema({
  requestType: {
    type: String,
    required: true,
    enum: ['user_verification', 'organ_request', 'donor_registration'],
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected'],
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
  },
  donorId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  organType: {
    type: String,
  },
  bloodType: {
    type: String,
  },
  message: {
    type: String,
  },
  rejectionReason: {
    type: String,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
}, { timestamps: true });

export default mongoose.models.Request || mongoose.model('Request', RequestSchema);

