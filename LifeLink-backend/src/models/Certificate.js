import mongoose from 'mongoose'

const CertificateSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  donorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  donorName: { type: String, required: true },
  organOrBlood: { type: String, default: '' },
  dateOfDonation: { type: Date },
  hospitalName: { type: String, default: '' },
  certificateNumber: { type: String, required: true, unique: true },
  issuedAt: { type: Date, default: () => new Date() },
  // store HTML snapshot for easy download/viewing
  html: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema)
