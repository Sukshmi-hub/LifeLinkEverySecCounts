import express from 'express'
import Hospital from '../models/Hospital.js'
const router = express.Router()

// GET /api/hospitals
// Returns a simple list of hospitals for frontend dropdowns
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({}, 'name address location').sort({ name: 1 }).lean()
    const mapped = hospitals.map(h => ({ id: h._id, name: h.name, address: h.address || h.location?.full_address || '' }))
    return res.json({ success: true, data: mapped })
  } catch (err) {
    console.error('Failed to fetch hospitals:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch hospitals' })
  }
})

// GET /api/hospitals/:id/inventory
router.get('/:id/inventory', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean()
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })

    const Inventory = (await import('../models/Inventory.js')).default
    const items = await Inventory.find({ hospitalId: hospital._id }).lean()
    return res.json({ success: true, data: items })
  } catch (err) {
    console.error('Failed to fetch hospital inventory:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router
