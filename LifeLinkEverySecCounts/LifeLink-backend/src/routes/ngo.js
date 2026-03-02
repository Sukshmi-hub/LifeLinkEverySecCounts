// src/routes/ngo.js
import express from 'express'
import { getMyNgoProfile, updateMyNgoProfile, getAllNgos } from '../controllers/ngoController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { ngoOnly } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.get('/me', authMiddleware, ngoOnly, getMyNgoProfile)
router.put('/me', authMiddleware, ngoOnly, updateMyNgoProfile)
// Public listing for dropdowns
router.get('/', getAllNgos)

export default router
