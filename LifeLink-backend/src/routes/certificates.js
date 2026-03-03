import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { getMyCertificates, downloadCertificate } from '../controllers/certificateController.js'

const router = express.Router()

router.get('/me', authenticate, getMyCertificates)
router.get('/:id/download', authenticate, downloadCertificate)

export default router
