import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Dots from '../models/Dots.js'

const router = express.Router()

// GET /api/dots/:userId - returns which dots are active
router.get('/:userId', authenticate, async (req, res) => {
  try {
    // Use authenticated user id to look up dots (prevents mismatches between id shapes)
    const userId = String(req.user._id)

    let dots = await Dots.findOne({ userId })
    
    // If dots don't exist, create them
    if (!dots) {
      dots = await Dots.create({
        userId,
        userType: req.user.role,
        dots: {
          messages: false,
          requests: false,
          alerts: false,
          payments: false
        }
      })
    }
    
    return res.json({ success: true, data: dots.dots })
  } catch (err) {
    console.error('Failed to fetch dots', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch dots' })
  }
})

// PUT /api/dots/clear/:userId/:section - clears a dot when user visits that section
router.put('/clear/:userId/:section', authenticate, async (req, res) => {
  try {
    const { section } = req.params
    const userId = String(req.user._id)

    // Validate section
    const validSections = ['messages', 'requests', 'alerts', 'payments']
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section' })
    }

    let dots = await Dots.findOne({ userId })

    // If dots don't exist, create them
    if (!dots) {
      dots = await Dots.create({
        userId,
        userType: req.user.role,
        dots: {
          messages: false,
          requests: false,
          alerts: false,
          payments: false
        }
      })
    } else {
      // Clear the specific dot
      dots.dots[section] = false
      await dots.save()
    }

    return res.json({ success: true, data: dots.dots })
  } catch (err) {
    console.error('Failed to clear dot', err)
    return res.status(500).json({ success: false, message: 'Failed to clear dot' })
  }
})

// Internal helper function to set a dot (called from other routes)
router.put('/internal/:userId/:section/set', async (req, res) => {
  try {
    const { userId, section } = req.params
    
    // Validate section
    const validSections = ['messages', 'requests', 'alerts', 'payments']
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section' })
    }
    
    let dots = await Dots.findOne({ userId })
    
    // If dots don't exist, create them
    if (!dots) {
      const user = await mongoose.model('User').findById(userId)
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
      
      dots = await Dots.create({
        userId,
        userType: user.role,
        dots: {
          messages: section === 'messages',
          requests: section === 'requests',
          alerts: section === 'alerts',
          payments: section === 'payments'
        }
      })
    } else {
      // Set the specific dot
      dots.dots[section] = true
      await dots.save()
    }
    
    return res.json({ success: true, data: dots.dots })
  } catch (err) {
    console.error('Failed to set dot', err)
    return res.status(500).json({ success: false, message: 'Failed to set dot' })
  }
})

export default router
