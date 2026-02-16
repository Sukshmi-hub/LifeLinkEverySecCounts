// src/routes/patient.js
import express from 'express'
import { getMyPatientProfile, updateMyPatientProfile } from '../controllers/patientController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { patientOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, patientOnly, getMyPatientProfile)
router.put('/me', authMiddleware, patientOnly, updateMyPatientProfile)

export default router
