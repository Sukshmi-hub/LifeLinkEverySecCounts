// src/models/Message.js
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true },
  roomId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: () => new Date(), index: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true })

messageSchema.index({ roomId: 1, timestamp: -1 })

export default mongoose.model('Message', messageSchema)
