import Payment from '../models/Payment.js'
import Request from '../models/Request.js'

export const createSummary = async (req, res) => {
  try {
    let { hospitalId, patientId, surgeryFee = 0, hospitalCharges = 0, processingFee = 0, requestId = null } = req.body
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    // sanitize patientId: if an object was passed (populated Patient), extract its _id or userId
    if (typeof patientId === 'object' && patientId !== null) {
      if (patientId._id) patientId = String(patientId._id)
      else if (patientId.userId) patientId = String(patientId.userId)
      else if (patientId.id) patientId = String(patientId.id)
    }

    const totalAmount = Number(surgeryFee || 0) + Number(hospitalCharges || 0) + Number(processingFee || 0)

    const payment = new Payment({ hospitalId: hospitalId || null, patientId, surgeryFee, hospitalCharges, processingFee, totalAmount })
    const saved = await payment.save()

    // If a requestId is provided, mark the request as paymentSent and attach the paymentId
    if (requestId) {
      try {
        await Request.findByIdAndUpdate(requestId, { $set: { paymentSent: true, paymentId: saved._id } })
      } catch (updateErr) {
        console.error('Failed to update request with payment info', updateErr)
        // continue - payment was created, but request update failed
      }
    }

    return res.json({ success: true, data: saved })
  } catch (err) {
    console.error('createSummary error', err)
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' })
  }
}

export const getPaymentsForPatient = async (req, res) => {
  try {
    let { patientId } = req.params
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    // Accept either a Patient._id or a User._id (patient.userId)
    // If patientId corresponds to a User._id, find the Patient document first
    try {
      const Patient = (await import('../models/Patient.js')).default
      // Try to find a patient where userId equals the provided id
      const byUser = await Patient.findOne({ userId: patientId }).select('_id').lean()
      if (byUser && byUser._id) {
        patientId = String(byUser._id)
      }
    } catch (innerErr) {
      console.warn('Could not resolve patient by userId:', innerErr.message)
    }

    const payments = await Payment.find({ patientId }).sort({ createdAt: -1 }).limit(10)
    return res.json({ success: true, data: payments })
  } catch (err) {
    console.error('getPaymentsForPatient error', err)
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' })
  }
}
