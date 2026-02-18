// src/routes/ngo.js
import express from 'express'
import { getMyNgoProfile, updateMyNgoProfile } from '../controllers/ngoController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { ngoOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, ngoOnly, getMyNgoProfile)
router.put('/me', authMiddleware, ngoOnly, updateMyNgoProfile)

export default router
