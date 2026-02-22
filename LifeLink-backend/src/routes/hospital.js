// src/routes/hospital.js
import express from 'express'
import { getMyHospitalProfile, updateMyHospitalProfile, listHospitals } from '../controllers/hospitalController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { hospitalOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, hospitalOnly, getMyHospitalProfile)
router.put('/me', authMiddleware, hospitalOnly, updateMyHospitalProfile)
router.get('/list', authMiddleware, listHospitals)

export default router
