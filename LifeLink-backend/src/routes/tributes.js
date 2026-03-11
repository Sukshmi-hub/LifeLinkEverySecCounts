import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { createTribute, getMyTributes, getPublicTributes } from '../controllers/tributeController.js'

const router = express.Router()

router.post('/', authMiddleware, createTribute)
router.get('/mine', authMiddleware, getMyTributes)
router.get('/public', getPublicTributes)
// Temporary no-auth test route to verify the router is mounted
router.get('/test', (req, res) => res.json({ success: true, message: 'tributes route is mounted' }))

export default router
