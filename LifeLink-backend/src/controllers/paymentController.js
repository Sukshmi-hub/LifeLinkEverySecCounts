import Payment from '../models/Payment.js'

export const createSummary = async (req, res) => {
  try {
    const { hospitalId, patientId, surgeryFee = 0, hospitalCharges = 0, processingFee = 0 } = req.body
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    const totalAmount = Number(surgeryFee || 0) + Number(hospitalCharges || 0) + Number(processingFee || 0)

    const payment = new Payment({ hospitalId: hospitalId || null, patientId, surgeryFee, hospitalCharges, processingFee, totalAmount })
    const saved = await payment.save()

    return res.json({ success: true, data: saved })
  } catch (err) {
    console.error('createSummary error', err)
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' })
  }
}

export const getPaymentsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    const payments = await Payment.find({ patientId }).sort({ createdAt: -1 }).limit(10)
    return res.json({ success: true, data: payments })
  } catch (err) {
    console.error('getPaymentsForPatient error', err)
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' })
  }
}
