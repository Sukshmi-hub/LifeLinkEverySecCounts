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

export default router