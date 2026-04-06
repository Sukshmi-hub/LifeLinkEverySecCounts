import mongoose from 'mongoose'

const medicalChatMessageSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ['user', 'assistant'] },
  content: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
}, { _id: true })

const medicalChatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  messages: { type: [medicalChatMessageSchema], default: [] },
  lastMessageAt: { type: Date, default: () => new Date(), index: true },
}, { timestamps: true })

medicalChatSessionSchema.index({ userId: 1 }, { unique: true })

export default mongoose.model('MedicalChatSession', medicalChatSessionSchema)
