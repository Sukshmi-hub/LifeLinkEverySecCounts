import express from 'express'
import { createSummary, getPaymentsForPatient, createRazorpayOrder, verifyRazorpayPayment, getPaymentSummaryCountByHospital } from '../controllers/paymentController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Create a new payment summary (sent by hospital)
router.post('/create-summary', createSummary)

// Create a Razorpay order (backend) - amount should be provided in rupees
// Legacy: /order
router.post('/order', createRazorpayOrder)
// New explicit create-order endpoint required by flow
router.post('/create-order', createRazorpayOrder)

// Verify Razorpay payment signature and update DB
router.post('/verify', verifyRazorpayPayment)

// Get payment summaries for a patient
router.get('/patient/:patientId', getPaymentsForPatient)

// Get payment summary count sent by hospital
router.get('/hospital/count', authenticate, getPaymentSummaryCountByHospital)

export default router
