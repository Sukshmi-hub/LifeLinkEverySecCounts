import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  type: { type: String, default: 'info' },
  targetRole: { type: String, default: 'hospital' },
  recipientRole: { type: String, required: false },
  recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  recipientHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: false },
  senderHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  senderHospitalName: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
  timestamp: { type: Date, default: () => new Date(), index: true }
}, { timestamps: true })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
