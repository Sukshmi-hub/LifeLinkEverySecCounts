import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Notification from '../models/Notification.js'
import Hospital from '../models/Hospital.js'

const router = express.Router()

// GET /api/notifications
// Returns notifications for the authenticated user/hospital based on role and explicit recipientUserId
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user
    const role = (req.query.role || user?.role || '')
    const qOr = []

    // Notifications explicitly addressed to this user
    if (user && user._id) qOr.push({ recipientUserId: user._id })

    // Notifications targeted to user's role
    if (role) {
      const roleQuery = { targetRole: role }
      // If hospital, scope to hospital record unless explicit hospitalId provided
      if (String(role).toLowerCase() === 'hospital') {
        const hospitalId = req.query.hospitalId || null
        if (hospitalId) {
          roleQuery.recipientHospitalId = hospitalId
        } else {
          const hospital = await Hospital.findOne({ userId: user._id })
          if (hospital) roleQuery.recipientHospitalId = hospital._id
        }
      }
      qOr.push(roleQuery)
    }

    // Fallback: if query provided a targetRole explicitly, include it
    if (req.query.targetRole && !role) {
      qOr.push({ targetRole: req.query.targetRole })
    }

    const q = qOr.length > 0 ? { $or: qOr } : {}
    const list = await Notification.find(q).sort({ timestamp: -1 }).limit(200).lean()
    return res.json({ success: true, data: list })
  } catch (err) {
    console.error('Failed to fetch notifications', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' })
  }
})

// POST /api/notifications  -> create notification (internal/admin use)
router.post('/', authenticate, async (req, res) => {
  try {
    const body = req.body || {}
    const n = new Notification({
      title: body.title,
      message: body.message,
      type: body.type || 'info',
      targetRole: body.targetRole || undefined,
      recipientRole: body.recipientRole || undefined,
      recipientUserId: body.recipientUserId || undefined,
      recipientHospitalId: body.recipientHospitalId || undefined,
      requestId: body.requestId || undefined,
      senderUserId: body.senderUserId || undefined,
      senderHospitalId: body.senderHospitalId || undefined,
      senderHospitalName: body.senderHospitalName || ''
    })
    await n.save()
    return res.status(201).json({ success: true, data: n })
  } catch (err) {
    console.error('Failed to create notification', err)
    return res.status(500).json({ success: false, message: 'Failed to create notification' })
  }
})

// PUT /api/notifications/:id/read  -> mark read (only allowed for recipients)
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const id = req.params.id
    const notif = await Notification.findById(id)
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' })

    const user = req.user

    // Allow if explicitly addressed to this user
    if (notif.recipientUserId && String(notif.recipientUserId) === String(user._id)) {
      notif.read = true
      await notif.save()
      return res.json({ success: true, data: notif })
    }

    // If notification is hospital-scoped, ensure hospital user matches
    if (notif.targetRole === 'hospital' || notif.recipientRole === 'hospital') {
      const hospital = await Hospital.findOne({ userId: user._id })
      if (!hospital || String(hospital._id) !== String(notif.recipientHospitalId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
      notif.read = true
      await notif.save()
      return res.json({ success: true, data: notif })
    }

    // If notification targets a role, allow if user's role matches
    if (notif.targetRole && user && String(notif.targetRole).toLowerCase() === String(user.role).toLowerCase()) {
      notif.read = true
      await notif.save()
      return res.json({ success: true, data: notif })
    }

    return res.status(403).json({ success: false, message: 'Forbidden' })
  } catch (err) {
    console.error('Failed to mark notification read', err)
    return res.status(500).json({ success: false, message: 'Failed to update notification' })
  }
})

export default router
