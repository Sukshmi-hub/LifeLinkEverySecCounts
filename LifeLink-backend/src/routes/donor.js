// src/routes/donor.js
import express from 'express'
import { getMyDonorProfile, updateMyDonorProfile } from '../controllers/donorController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { donorOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, donorOnly, getMyDonorProfile)
router.put('/me', authMiddleware, donorOnly, updateMyDonorProfile)

export default router
