import express from 'express'
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js'
import Request from '../models/Request.js'
const router = express.Router()

// Create a new request (authenticated if possible, otherwise allow patientId in body for dev)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const user = req.user
    const { organType, urgency, hospital, details, patientId, patientName } = req.body

    const finalPatientId = user ? user._id : patientId
    const finalPatientName = user ? user.name : patientName || 'Anonymous'

    if (!finalPatientId) return res.status(400).json({ success: false, message: 'patientId required' })

    const reqDoc = new Request({
      patientId: finalPatientId,
      patientName: finalPatientName,
      organType: organType || '',
      urgency: urgency || 'Low',
      hospital: hospital || null,
      details: details || '',
    })

    await reqDoc.save()
    return res.status(201).json({ success: true, data: reqDoc })
  } catch (err) {
    console.error('Create request failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to create request' })
  }
})

// Get requests; supports filtering by patientId or hospitalId
router.get('/', optionalAuth, async (req, res) => {
  try {
    const user = req.user
    const queryPatientId = req.query.patientId || req.body.patientId
    const queryHospitalId = req.query.hospitalId || req.body.hospitalId

    // If hospitalId provided, return requests for that hospital
    if (queryHospitalId) {
      const list = await Request.find({ hospital: queryHospitalId }).sort({ createdAt: -1 }).lean()
      return res.json({ success: true, data: list })
    }

    const patientId = user ? user._id : queryPatientId
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId required' })
    const list = await Request.find({ patientId }).sort({ createdAt: -1 }).lean()
    return res.json({ success: true, data: list })
  } catch (err) {
    console.error('Fetch requests failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' })
  }
})

// Dashboard counts for patient (auth optional, can pass patientId)
router.get('/dashboard', optionalAuth, async (req, res) => {
  try {
    const user = req.user
    const queryPatientId = req.query.patientId || req.body.patientId
    const userId = user ? user._id : queryPatientId
    if (!userId) return res.status(400).json({ success: false, message: 'patientId required' })

    const total = await Request.countDocuments({ patientId: userId })
    const pending = await Request.countDocuments({ patientId: userId, status: 'Pending' })
    const matched = await Request.countDocuments({ patientId: userId, status: { $in: ['Accepted', 'Donor Matched'] } })
    const emergencies = await Request.countDocuments({ patientId: userId, urgency: 'High' })

    return res.json({ success: true, data: { activeRequests: total, pending, matched, emergencies } })
  } catch (err) {
    console.error('Dashboard counts failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard counts' })
  }
})

export default router