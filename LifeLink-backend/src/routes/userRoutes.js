// src/routes/userRoutes.js - User context route
import express from 'express'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// GET /me - return current logged-in user (protected)
router.get('/me', authenticate, async (req, res) => {
  try {
    const possibleId = req.user && (req.user.userId || req.user.id || req.user._id)
    const userId = possibleId && (typeof possibleId === 'object' ? possibleId.toString() : possibleId)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const user = await User.findById(userId).select('-password')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.json({ success: true, user })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
