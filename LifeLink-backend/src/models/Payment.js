import mongoose from 'mongoose'

const PaymentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  surgeryFee: { type: Number, default: 0 },
  hospitalCharges: { type: Number, default: 0 },
  processingFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Payment', PaymentSchema)
