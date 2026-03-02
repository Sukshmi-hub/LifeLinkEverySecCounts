// src/routes/hospital.js
import express from 'express'
import { getMyHospitalProfile, updateMyHospitalProfile, listHospitals, getHospitalInventory, updateHospitalInventory, getPublicHospitalInventory, getHospitalById } from '../controllers/hospitalController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { hospitalOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, hospitalOnly, getMyHospitalProfile)
router.put('/me', authMiddleware, hospitalOnly, updateMyHospitalProfile)
router.get('/list', authMiddleware, listHospitals)
// Public inventory for a hospital id
// inventory endpoints (authenticated hospital users)
router.get('/inventory', authMiddleware, hospitalOnly, getHospitalInventory)
router.put('/inventory', authMiddleware, hospitalOnly, updateHospitalInventory)
// Allow POST as well for clients that may not send PUT reliably
router.post('/inventory', authMiddleware, hospitalOnly, updateHospitalInventory)
// Public inventory for a hospital id
router.get('/:id/inventory', getPublicHospitalInventory)
// Public hospital details by id
router.get('/:id', getHospitalById)

export default router
