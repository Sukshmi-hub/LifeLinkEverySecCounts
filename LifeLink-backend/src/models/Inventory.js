import mongoose from 'mongoose'

const InventorySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  itemType: { type: String, enum: ['organ', 'blood'], required: true },
  organType: { type: String, default: '' },
  bloodType: { type: String, default: '' },
  count: { type: Number, default: 0 },
}, { timestamps: true })

InventorySchema.index({ hospitalId: 1, itemType: 1, organType: 1, bloodType: 1 }, { unique: true })

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema)
