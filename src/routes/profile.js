// src/routes/profile.js
import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { getProfile, updateProfile } from '../controllers/profileController.js'

const router = express.Router()

router.get('/', authenticate, getProfile)
router.put('/', authenticate, updateProfile)

export default router