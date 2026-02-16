// src/routes/hospital.js
import express from 'express'
import { getMyHospitalProfile, updateMyHospitalProfile } from '../controllers/hospitalController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { hospitalOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, hospitalOnly, getMyHospitalProfile)
router.put('/me', authMiddleware, hospitalOnly, updateMyHospitalProfile)

export default router
