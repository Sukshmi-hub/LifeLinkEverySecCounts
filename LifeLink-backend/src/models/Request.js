import mongoose from 'mongoose';

const { Schema } = mongoose;

const RequestSchema = new Schema({
  requestType: {
    type: String,
    required: true,
    enum: ['user_verification', 'organ_request', 'donor_registration', 'fund_request'],
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'SentToHospital', 'VerifiedByHospital', 'Donor Matched'],
  },
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
  },
  patientName: {
    type: String,
  },
  donorId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    required: false,
  },
  // Human-friendly name of the hospital patient was admitted in (denormalized for UI)
  patientHospitalName: { type: String, default: '' },
  // Human-friendly patient location snapshot at time of request
  patientLocation: { type: String, default: '' },
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
  files: {
    medicalReports: [{ type: String }],
    prescription: { type: String },
    idProof: { type: String },
    additional: [{ type: String }],
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
  // Fund request specific fields
  amount: { type: Number, default: 0 },
  ngoId: { type: Schema.Types.ObjectId, ref: 'NGO', default: null },
  ngoName: { type: String, default: '' },
  sourceRequestId: { type: Schema.Types.ObjectId, ref: 'Request', default: null },
  // Optional breakdown stored for fund requests (patient-entered fees)
  breakdown: {
    transplantFee: { type: Number, default: 0 },
    hospitalCharges: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
  },
  // Also store top-level numeric fields for backwards compatibility
  transplantFee: { type: Number, default: 0 },
  hospitalCharges: { type: Number, default: 0 },
  processingFee: { type: Number, default: 0 },
  // Payment-related fields
  paymentSent: { type: Boolean, default: false },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: false, default: null },
  paymentReceived: { type: Boolean, default: false },
  paymentStatus: { type: String, default: 'pending' },
  // Red alert flags
  isRedAlert: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
}, { timestamps: true });

// Fields added for donor-matching flow
RequestSchema.add({
  matchedDonor: { type: Schema.Types.Mixed, default: null },
  matchedAt: { type: Date },
  detailsSentToPatientHospital: { type: Boolean, default: false },
  sentToPatientHospitalAt: { type: Date }
});

// Fields for tracking which hospital the matched details were sent to/from
RequestSchema.add({
  receivingHospitalName: { type: String, default: '' },
  receivingHospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', default: null },
  sentFromHospitalName: { type: String, default: '' },
  sentFromHospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', default: null }
});

export default mongoose.models.Request || mongoose.model('Request', RequestSchema);

