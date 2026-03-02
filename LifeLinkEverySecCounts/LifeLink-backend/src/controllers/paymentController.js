import Payment from '../models/Payment.js'
import Request from '../models/Request.js'
import crypto from 'crypto'
import axios from 'axios'

// Razorpay SDK will be dynamically imported when needed (avoid startup errors if not installed)

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

// Create a Razorpay order on the backend. This ensures secrets stay server-side.
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount /* in rupees */, hospitalId, patientId, patientName = '', requestId = null } = req.body
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'amount is required and must be > 0' })
    if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId is required' })

    // Find hospital to get linked Razorpay account id
    const Hospital = (await import('../models/Hospital.js')).default
    const hospital = await Hospital.findById(hospitalId).lean()
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })
    // Support both legacy `razorpayAccountId` and newer `razorpayLinkedAccountId` fields
    const linkedAccount = hospital.razorpayLinkedAccountId || hospital.razorpayAccountId
    if (!linkedAccount) {
      // In development allow proceeding without a linked account (we will not include transfers)
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ success: false, message: 'Hospital does not have a Razorpay linked account configured' })
      } else {
        console.warn('Hospital missing linkedAccount; continuing in development without transfers')
      }
    }

    // Use environment variables for Razorpay keys
    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    // Debug logs to help locate env issues (do not print secrets)
    console.log('createRazorpayOrder: linkedAccount=', linkedAccount)
    console.log('createRazorpayOrder: RAZORPAY_KEY_ID present=', !!key_id)
    console.log('createRazorpayOrder: RAZORPAY_KEY_SECRET present=', !!key_secret)
    console.log('createRazorpayOrder: key_id_len=', key_id ? String(key_id.length) : 'none')
    console.log('createRazorpayOrder: key_secret_len=', key_secret ? String(key_secret.length) : 'none')

    if (!key_id || !key_secret) {
      console.error('Razorpay keys missing in environment. Ensure .env in backend root and restart server.')
      return res.status(500).json({ success: false, message: 'Razorpay keys not configured on server. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in backend .env and server restarted.' })
    }

    const Razorpay = (await import('razorpay')).default
    const razor = new Razorpay({ key_id, key_secret })

    // Amount to paise: Razorpay expects integer amount in smallest currency unit
    // e.g. Rs 500.00 => 50000 paise
    const amountPaise = Math.round(Number(amount) * 100)

    // Create order with transfers to hospital linked account so platform never holds funds.
    // Razorpay 'transfers' on order creation allows specifying amount and destination linked account.
    const orderOptions = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { hospitalId: String(hospitalId), requestId: String(requestId || '') }
    }

    // Only include transfers when the linked account looks valid (Razorpay linked account ids are 18 chars)
    try {
      const hasValidLinkedAccount = typeof linkedAccount === 'string' && linkedAccount.length === 18
      if (hasValidLinkedAccount) {
        orderOptions.transfers = [
          {
            account: linkedAccount,
            amount: amountPaise,
            currency: 'INR',
            notes: { purpose: 'hospital_settlement' }
          }
        ]
      } else {
        console.warn('Skipping transfers: invalid linkedAccount format', linkedAccount)
      }
    } catch (e) {
      console.warn('Error validating linkedAccount for transfers', e)
    }

    let order
    try {
      order = await razor.orders.create(orderOptions)
    } catch (createErr) {
      console.error('Razorpay order creation with transfers failed, retrying without transfers', createErr && createErr.message)
      // Retry without transfers (useful in development or if linked account doesn't permit transfers)
      try {
        const fallbackOptions = { ...orderOptions }
        delete fallbackOptions.transfers
        order = await razor.orders.create(fallbackOptions)
      } catch (fallbackErr) {
        console.error('Razorpay fallback order creation also failed', fallbackErr)
        // As a last resort try a direct axios POST to Razorpay Orders API (uses same auth)
        try {
          console.warn('Attempting direct axios POST to Razorpay as fallback')
          const key_id_local = key_id
          const key_secret_local = key_secret
          const axiosOptions = { ...orderOptions }
          delete axiosOptions.transfers
          const resp = await axios.post('https://api.razorpay.com/v1/orders', axiosOptions, { auth: { username: key_id_local, password: key_secret_local } })
          order = resp.data
        } catch (axiosErr) {
          console.error('Direct axios fallback also failed', axiosErr && (axiosErr.response ? axiosErr.response.data : axiosErr.message))
          throw axiosErr
        }
        throw fallbackErr
      }
    }

    // Save a Payment record as pending
    const payment = new Payment({
      hospitalId,
      patientId,
      orderId: order.id,
      patientName: patientName || '',
      amount: Number(amount),
      totalAmount: Number(amount),
      status: 'pending'
    })
    await payment.save()

    // If requestId provided, link this payment to the Request and mark paymentSent
    if (requestId) {
      try {
        await Request.findByIdAndUpdate(requestId, { $set: { paymentSent: true, paymentId: payment._id } })
      } catch (reqErr) {
        console.error('Failed to attach payment to request', reqErr)
      }
    }

    // Return order details and key_id (public) so frontend can open checkout
    const hospitalName = hospital && (hospital.name || hospital.hospitalName || hospital.displayName) || ''
    const summary = { paymentId: payment._id, status: payment.status, amount: payment.amount }
    return res.json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency, key_id, hospitalName, summary } })
  } catch (err) {
    console.error('createRazorpayOrder error', err)
    // re-extract request body values for fallback since they were declared inside try
    const { amount, hospitalId, patientId, patientName = '', requestId = null } = req.body || {}
    // Normalize error info from Razorpay SDK or axios
    const statusCode = err && (err.statusCode || (err.response && err.response.status))
    const rpDesc = (err && err.error && err.error.description) || (err && err.response && err.response.data && (err.response.data.error && err.response.data.error.description || err.response.data.description)) || null
    const isAuthFail = (statusCode === 401) || (rpDesc && String(rpDesc).toLowerCase().includes('authentication'))
    if (isAuthFail && process.env.NODE_ENV !== 'production') {
      try {
        // Create a mock order/payment locally so developers can test the flow without valid Razorpay keys
        const mockOrderId = `mock_order_${Date.now()}`
        const mockPaymentId = `mock_pay_${Date.now()}`
        const payment = new Payment({
          hospitalId,
          patientId,
          orderId: mockOrderId,
          paymentId: mockPaymentId,
          patientName: patientName || '',
          amount: Number(amount),
          totalAmount: Number(amount),
          status: 'success',
        })
        await payment.save()
        // If requestId provided, link this payment to the Request and mark paymentSent
        if (requestId) {
          try {
            await Request.findByIdAndUpdate(requestId, { $set: { paymentSent: true, paymentId: payment._id } })
          } catch (reqErr) {
            console.error('Failed to attach mock payment to request', reqErr)
          }
        }
        const amountPaiseFallback = Math.round(Number(amount) * 100)
        return res.json({ success: true, data: { mock: true, orderId: mockOrderId, amount: amountPaiseFallback, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID || '', payment: { paymentId: mockPaymentId, status: 'success' } } })
      } catch (mockErr) {
        console.error('Failed to create mock payment fallback', mockErr)
      }
    }

    const message = rpDesc || (err && err.message) || 'Internal Server Error'
    // If Razorpay returned a 401 propagate that so frontend can surface correct action
    if (statusCode === 401) return res.status(401).json({ success: false, message })
    return res.status(502).json({ success: false, message })
  }
}

// Verify Razorpay payment signature and update Payment document
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required verification fields' })
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_secret) return res.status(500).json({ success: false, message: 'Razorpay secret not configured' })

    // Signature verification: compute expected signature and compare
    // This prevents a forged success callback; only Razorpay's signature will match
    const generated_signature = crypto.createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generated_signature !== razorpay_signature) {
      console.warn('Razorpay signature mismatch', { generated_signature, razorpay_signature })
      return res.status(400).json({ success: false, message: 'Invalid signature' })
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { $set: { paymentId: razorpay_payment_id, status: 'success', method: (req.body.method || null) } },
      { new: true }
    )

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' })

    // Also update the related Request (if any) to mark payment received
    if (payment && payment._id) {
      try {
        await Request.findOneAndUpdate({ paymentId: payment._id }, { $set: { paymentSent: true } })
      } catch (reqErr) {
        console.error('Failed to update related request after payment verify', reqErr)
      }
    }
    // Build receipt object: attempt to fetch payment details from Razorpay for richer info
    let receipt = {
      transactionId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount || null,
      currency: 'INR',
      method: req.body.method || null,
      createdAt: new Date()
    }
    try {
      const key_id = process.env.RAZORPAY_KEY_ID
      const key_secret = process.env.RAZORPAY_KEY_SECRET
      if (key_id && key_secret) {
        const Razorpay = (await import('razorpay')).default
        const razor = new Razorpay({ key_id, key_secret })
        try {
          const fetched = await razor.payments.fetch(razorpay_payment_id)
          if (fetched) {
            receipt.method = fetched.method || receipt.method
            receipt.amount = (fetched.amount ? Math.round(Number(fetched.amount) / 100) : receipt.amount)
            receipt.currency = fetched.currency || receipt.currency
            receipt.createdAt = fetched.created_at ? new Date(Number(fetched.created_at) * 1000) : receipt.createdAt
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch payment details from Razorpay', fetchErr && (fetchErr.response ? fetchErr.response.data : fetchErr.message))
        }
      }
    } catch (e) {
      console.warn('Razorpay SDK not available to fetch payment details', e && e.message)
    }

    // Attach hospital name if available
    let hospitalName = ''
    try {
      const Hospital = (await import('../models/Hospital.js')).default
      const hosp = await Hospital.findById(payment.hospitalId).lean()
      hospitalName = hosp && (hosp.name || hosp.hospitalName || '')
    } catch (e) {
      // ignore
    }

    return res.json({ success: true, data: { payment, receipt: { ...receipt, hospitalName } } })
  } catch (err) {
    console.error('verifyRazorpayPayment error', err)
    const rpDesc = err && err.error && err.error.description ? String(err.error.description) : null
    const message = rpDesc || err.message || 'Internal Server Error'
    return res.status(502).json({ success: false, message })
  }
}
