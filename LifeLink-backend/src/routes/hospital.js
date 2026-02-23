// src/routes/hospital.js
import express from 'express'
import { getMyHospitalProfile, updateMyHospitalProfile, listHospitals, getHospitalInventory, updateHospitalInventory } from '../controllers/hospitalController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { hospitalOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, hospitalOnly, getMyHospitalProfile)
router.put('/me', authMiddleware, hospitalOnly, updateMyHospitalProfile)
router.get('/list', authMiddleware, listHospitals)
// inventory endpoints
router.get('/inventory', authMiddleware, hospitalOnly, getHospitalInventory)
router.put('/inventory', authMiddleware, hospitalOnly, updateHospitalInventory)
// Allow POST as well for clients that may not send PUT reliably
router.post('/inventory', authMiddleware, hospitalOnly, updateHospitalInventory)

export default router
