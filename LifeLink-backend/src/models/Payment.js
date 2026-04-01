import mongoose from 'mongoose'

const PaymentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  // Razorpay fields
  orderId: { type: String, default: '' }, // Razorpay Order ID
  paymentId: { type: String, default: '' }, // Razorpay Payment ID (filled after success)
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  patientName: { type: String, default: '' },
  amount: { type: Number, default: 0 }, // amount in rupees
  surgeryFee: { type: Number, default: 0 },
  transplantSurgeryFee: { type: Number, default: 0 },
  hospitalCharges: { type: Number, default: 0 },
  processingFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Payment', PaymentSchema)
