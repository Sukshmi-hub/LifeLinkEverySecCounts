import mongoose from 'mongoose'

const DotsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  userType: { type: String, enum: ['hospital', 'donor', 'patient', 'ngo'], required: true },
  dots: {
    messages: { type: Boolean, default: false },
    requests: { type: Boolean, default: false },
    alerts: { type: Boolean, default: false },
    payments: { type: Boolean, default: false }
  }
}, { timestamps: true })

export default mongoose.models.Dots || mongoose.model('Dots', DotsSchema)
