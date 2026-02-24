import express from 'express'
import { createSummary, getPaymentsForPatient } from '../controllers/paymentController.js'

const router = express.Router()

// Create a new payment summary (sent by hospital)
router.post('/create-summary', createSummary)

// Get payment summaries for a patient
router.get('/patient/:patientId', getPaymentsForPatient)

export default router
