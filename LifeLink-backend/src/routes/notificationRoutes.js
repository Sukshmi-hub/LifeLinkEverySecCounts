import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import Hospital from '../models/Hospital.js'

const router = express.Router()

// GET /api/notifications?role=hospital&hospitalId=...
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user
    const q = {}
    // If a role query provided, use it; else default to user's role
    const role = req.query.role || user?.role
    if (role) q.targetRole = role

    // Resolve hospitalId: prefer query param, else if user is hospital, use their hospital.
    const hospitalId = req.query.hospitalId || null
    if (hospitalId) {
      q.recipientHospitalId = hospitalId
    } else if (user && String(user.role).toLowerCase() === 'hospital') {
      const hospital = await Hospital.findOne({ userId: user._id })
      if (hospital) q.recipientHospitalId = hospital._id
    }

    const list = await Notification.find(q).sort({ timestamp: -1 }).limit(200).lean()
    return res.json({ success: true, data: list })
  } catch (err) {
    console.error('Failed to fetch notifications', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' })
  }
})

// PUT /api/notifications/:id/read  -> toggle read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const id = req.params.id
    const notif = await Notification.findById(id)
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' })

    // Only allow marking if user has access (hospital matches or user role equals)
    if (notif.targetRole === 'hospital') {
      const hospital = await Hospital.findOne({ userId: req.user._id })
      if (!hospital || String(hospital._id) !== String(notif.recipientHospitalId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    }

    notif.read = true
    await notif.save()
    return res.json({ success: true, data: notif })
  } catch (err) {
    console.error('Failed to mark notification read', err)
    return res.status(500).json({ success: false, message: 'Failed to update notification' })
  }
})

export default router
