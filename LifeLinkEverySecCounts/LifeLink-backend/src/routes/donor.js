// src/routes/donor.js
import express from 'express'
import { getMyDonorProfile, updateMyDonorProfile } from '../controllers/donorController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { donorOnly } from '../middleware/roleMiddleware.js'
import { createDonationIntent } from '../controllers/donationController.js'

const router = express.Router()

router.get('/me', authMiddleware, donorOnly, getMyDonorProfile)
router.put('/me', authMiddleware, donorOnly, updateMyDonorProfile)
router.post('/intent', authMiddleware, donorOnly, createDonationIntent)

export default router
