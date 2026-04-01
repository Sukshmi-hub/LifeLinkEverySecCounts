import Payment from '../models/Payment.js'
import Request from '../models/Request.js'
import Donor from '../models/Donor.js'
import Hospital from '../models/Hospital.js'
import Dots from '../models/Dots.js'
import { createCertificateForDonor } from './certificateController.js'
import crypto from 'crypto'
import axios from 'axios'

// Razorpay SDK will be dynamically imported when needed (avoid startup errors if not installed)

export const createSummary = async (req, res) => {
  try {
    let {
      hospitalId,
      patientId,
      surgeryFee,
      transplantSurgeryFee,
      transplantFee,
      hospitalCharges,
      processingFee,
      totalAmount: totalAmountInput,
      requestId = null
    } = req.body
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    // sanitize patientId: if an object was passed (populated Patient), extract its _id or userId
    if (typeof patientId === 'object' && patientId !== null) {
      if (patientId._id) patientId = String(patientId._id)
      else if (patientId.userId) patientId = String(patientId.userId)
      else if (patientId.id) patientId = String(patientId.id)
    }

    const normalizedSurgeryFee = Number(transplantSurgeryFee ?? surgeryFee ?? transplantFee ?? 0)
    const normalizedHospitalCharges = Number(hospitalCharges ?? 0)
    const normalizedProcessingFee = Number(processingFee ?? 0)
    const hasExplicitFees = [normalizedSurgeryFee, normalizedHospitalCharges, normalizedProcessingFee].some((value) => Number(value) > 0)
    const finalSurgeryFee = hasExplicitFees && normalizedSurgeryFee > 0 ? normalizedSurgeryFee : 50000
    const finalHospitalCharges = hasExplicitFees && normalizedHospitalCharges > 0 ? normalizedHospitalCharges : 20000
    const finalProcessingFee = hasExplicitFees && normalizedProcessingFee > 0 ? normalizedProcessingFee : 5000
    const totalAmount = Number(totalAmountInput || 0) > 0
      ? Number(totalAmountInput)
      : finalSurgeryFee + finalHospitalCharges + finalProcessingFee

    const payment = new Payment({
      hospitalId: hospitalId || null,
      patientId,
      surgeryFee: finalSurgeryFee,
      transplantSurgeryFee: finalSurgeryFee,
      hospitalCharges: finalHospitalCharges,
      processingFee: finalProcessingFee,
      totalAmount,
      amount: totalAmount,
    })
    const saved = await payment.save()

    // If a requestId is provided, mark the request as paymentSent and attach the paymentId
    if (requestId) {
      try {
        await Request.findByIdAndUpdate(requestId, {
          $set: {
            paymentSent: true,
            paymentId: saved._id,
            transplantFee: finalSurgeryFee,
            hospitalCharges: finalHospitalCharges,
            processingFee: finalProcessingFee,
            amount: totalAmount,
            breakdown: {
              transplantFee: finalSurgeryFee,
              hospitalCharges: finalHospitalCharges,
              processingFee: finalProcessingFee,
            },
          }
        })
      } catch (updateErr) {
        console.error('Failed to update request with payment info', updateErr)
        // continue - payment was created, but request update failed
      }
      // Set payments dot for the patient so sidebar shows updates
      try {
        let targetUserId = null
        try {
          const Patient = (await import('../models/Patient.js')).default
          const p = await Patient.findById(patientId).lean()
          if (p && p.userId) targetUserId = String(p.userId)
        } catch (e) {
          // fallback: patientId might already be a user id
          targetUserId = String(patientId)
        }
        if (targetUserId) {
          await Dots.findOneAndUpdate(
            { userId: targetUserId },
            { $set: { 'dots.payments': true }, $setOnInsert: { userType: 'patient' } },
            { upsert: true }
          )
        try {
          const map = global.__LIFELINK_USER_SOCKET_MAP
          const ioRef = global.__LIFELINK_IO
          if (map && ioRef && map.has(String(targetUserId))) {
            ioRef.to(map.get(String(targetUserId))).emit('dots_updated', { section: 'payments' })
          }
        } catch (e) {}
        }
      } catch (e) {
        console.warn('Failed to set payments dot after creating payment summary', e && e.message)
      }
      // Attempt to generate donation certificate for matched donor (only once)
      try {
        const reqDoc = await Request.findById(requestId).lean()
        if (reqDoc) {
            // Try to derive donor id from matchedDonor snapshot or top-level donorId
            let donorId = null
            try {
              if (reqDoc.matchedDonor && reqDoc.matchedDonor.raw && reqDoc.matchedDonor.raw._resolvedDonor && reqDoc.matchedDonor.raw._resolvedDonor.id) {
                donorId = reqDoc.matchedDonor.raw._resolvedDonor.id
              }
              donorId = donorId || (reqDoc.donorId ? String(reqDoc.donorId) : null)
              donorId = donorId || (reqDoc.matchedDonor && (reqDoc.matchedDonor.donorId || reqDoc.matchedDonor._id) ? String(reqDoc.matchedDonor.donorId || reqDoc.matchedDonor._id) : null)

              // Fallback: if no id yet, try matching by donor name + blood type (best-effort)
              if (!donorId && reqDoc.matchedDonor) {
                const candName = (reqDoc.matchedDonor.name || reqDoc.matchedDonor.raw && reqDoc.matchedDonor.raw.name || '')
                const candBlood = (reqDoc.matchedDonor.bloodType || reqDoc.matchedDonor.raw && (reqDoc.matchedDonor.raw.blood_type || reqDoc.matchedDonor.raw.blood) || '')
                if (candName && candName.trim()) {
                  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  const q = { name: { $regex: `^${esc(candName.trim())}$`, $options: 'i' } }
                  if (candBlood && candBlood.trim()) q.blood_type = candBlood.trim()
                  try {
                    const found = await Donor.findOne(q).lean()
                    if (found && found._id) donorId = String(found._id)
                  } catch (e) {
                    // ignore
                  }
                }
              }
            } catch (e) {
              console.error('Error while resolving donorId for certificate generation', e)
            }

            console.debug('Certificate resolution: donorId=', donorId, 'matchedDonor:', reqDoc.matchedDonor && { name: reqDoc.matchedDonor.name, bloodType: reqDoc.matchedDonor.bloodType })

            if (donorId) {
            try {
              const donorDoc = await Donor.findById(donorId).lean()
              if (donorDoc) {
                const donorName = donorDoc.name || donorDoc.fullName || ''
                  // Prefer the organ donated (organOffered/organType/organ) over blood type when available
                  const organOrBlood = reqDoc.matchedDonor && (
                      reqDoc.matchedDonor.organOffered || reqDoc.matchedDonor.organType || reqDoc.matchedDonor.organ || reqDoc.matchedDonor.bloodType
                    ) || reqDoc.organType || reqDoc.bloodType || ''
                  // Prefer hospital name from matchedDonor snapshot (senderHospitalName / hospitalName),
                  // then fall back to receiving/patient or donor.hospital resolution.
                  let hospitalName = (reqDoc.matchedDonor && (reqDoc.matchedDonor.senderHospitalName || reqDoc.matchedDonor.hospitalName)) || reqDoc.receivingHospitalName || reqDoc.patientHospitalName || ''
                  if (!hospitalName && donorDoc.hospital) {
                  try {
                    const hospitalDoc = await Hospital.findById(donorDoc.hospital).lean()
                    hospitalName = hospitalDoc?.name || hospitalName
                  } catch (e) {}
                }
                const cert = await createCertificateForDonor({ donorId: donorDoc._id, donorUserId: donorDoc.userId || null, donorName, organOrBlood, dateOfDonation: new Date(), hospitalName, sourceRequestId: requestId || reqDoc._id || null })
                if (cert) {
                  console.debug('Certificate created for donor', { donorId: donorDoc._id, certId: cert._id })
                }
              }
            } catch (e) {
              console.error('Failed to resolve donor or create certificate', e)
            }
          }
        }
      } catch (e) {
        console.error('Certificate generation attempted but failed', e)
      }
    }

    return res.json({
      success: true,
      data: {
        ...saved.toObject(),
        transplantSurgeryFee: finalSurgeryFee,
        transplantFee: finalSurgeryFee,
        surgeryFee: finalSurgeryFee,
        hospitalCharges: finalHospitalCharges,
        processingFee: finalProcessingFee,
        totalAmount,
      }
    })
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
    const { amount /* in rupees */, hospitalId, patientId: rawPatientId, patientName = '', requestId = null } = req.body
    let patientId = rawPatientId
    // Accept either a Patient._id or a User._id (patient.userId). Normalize to Patient._id so Payment.patientId matches queries.
    try {
      const PatientModel = (await import('../models/Patient.js')).default
      if (patientId) {
        // If patientId refers to a User._id, find corresponding Patient doc
        const byUser = await PatientModel.findOne({ userId: patientId }).select('_id').lean()
        if (byUser && byUser._id) patientId = String(byUser._id)
      }
    } catch (e) {
      // ignore resolution errors; continue with provided id
      console.warn('Could not normalize patientId for payment creation', e && e.message)
    }
    // If a request is attached, prefer the patient from that request so NGO-paid
    // requests are recorded against the actual patient rather than the NGO user.
    if (requestId) {
      try {
        const requestDoc = await Request.findById(requestId).lean()
        if (requestDoc && requestDoc.patientId) {
          const requestPatientId = requestDoc.patientId._id || requestDoc.patientId.id || requestDoc.patientId
          if (requestPatientId) patientId = String(requestPatientId)
        }
      } catch (e) {
        console.warn('Could not resolve patientId from requestId for payment creation', e && e.message)
      }
    }
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'amount is required and must be > 0' })
    if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId is required' })

    // Find hospital to get linked Razorpay account id
    const Hospital = (await import('../models/Hospital.js')).default
    const hospital = await Hospital.findById(hospitalId).lean()
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })
    // Support both legacy `razorpayAccountId` and newer `razorpayLinkedAccountId` fields.
    // If the hospital does not have a linked account yet, proceed without transfers so
    // patient payments can still be created during testing or rollout.
    const linkedAccount = hospital.razorpayLinkedAccountId || hospital.razorpayAccountId || process.env.RAZORPAY_ACCOUNT_ID || ''

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

    // Create order. If a linked account is available, attach transfers; otherwise create
    // a normal Razorpay order and let settlement happen through the main account.
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
        console.warn('Skipping transfers: no valid linkedAccount configured; creating order without hospital transfer')
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
        const reqUpdate = await Request.findOneAndUpdate(
          { paymentId: payment._id },
          { $set: { paymentSent: true, paymentReceived: true, paymentStatus: 'success' } },
          { new: true }
        )
        if (reqUpdate && String(reqUpdate.requestType || '') === 'fund_request' && reqUpdate.sourceRequestId) {
          try {
            await Request.findByIdAndUpdate(
              reqUpdate.sourceRequestId,
              { $set: { paymentSent: true, paymentReceived: true, paymentStatus: 'success', status: 'VerifiedByHospital' } },
              { new: true }
            )
          } catch (sourceUpdateErr) {
            console.error('Failed to sync source organ request after NGO payment', sourceUpdateErr)
          }
        }
        // If we found the request, mark it as verified so it leaves the NGO pay-verify queue
        if (reqUpdate) {
          try {
            reqUpdate.status = 'VerifiedByHospital'
            reqUpdate.verifiedByHospitalAt = new Date()
            await reqUpdate.save()
            // Notify patient + NGO + hospital via dots and realtime socket
            try {
              const map = global.__LIFELINK_USER_SOCKET_MAP
              const ioRef = global.__LIFELINK_IO
              // Patient user
              try {
                const p = await (await import('../models/Patient.js')).default.findById(reqUpdate.patientId).lean()
                const patientUserId = p && (p.userId || p.requestedBy) ? String(p.userId || p.requestedBy) : null
                if (patientUserId) {
                  await Dots.findOneAndUpdate({ userId: patientUserId }, { $set: { 'dots.alerts': true } }, { upsert: true })
                  if (map && ioRef && map.has(String(patientUserId))) ioRef.to(map.get(String(patientUserId))).emit('dots_updated', { section: 'alerts' })
                }
              } catch (e) {}
              // NGO user
              try {
                if (reqUpdate.ngoId) {
                  const NGOModel = (await import('../models/NGO.js')).default
                  const ngoDoc = await NGOModel.findById(reqUpdate.ngoId).lean()
                  const ngoUserId = ngoDoc && (ngoDoc.userId || ngoDoc._id) ? String(ngoDoc.userId || ngoDoc._id) : null
                  if (ngoUserId) {
                    await Dots.findOneAndUpdate({ userId: ngoUserId }, { $set: { 'dots.requests': true } }, { upsert: true })
                    if (map && ioRef && map.has(String(ngoUserId))) ioRef.to(map.get(String(ngoUserId))).emit('dots_updated', { section: 'requests' })
                  }
                }
              } catch (e) {}
              // Hospital user (if any)
              try {
                if (reqUpdate.hospitalId) {
                  const Hospital = (await import('../models/Hospital.js')).default
                  const hosp = await Hospital.findById(reqUpdate.hospitalId).lean()
                  const hospUserId = hosp && hosp.userId ? String(hosp.userId) : null
                  if (hospUserId) {
                    await Dots.findOneAndUpdate({ userId: hospUserId }, { $set: { 'dots.payments': true } }, { upsert: true })
                    if (map && ioRef && map.has(String(hospUserId))) ioRef.to(map.get(String(hospUserId))).emit('dots_updated', { section: 'payments' })
                  }
                }
              } catch (e) {}
            } catch (e) {}
          } catch (e) {
            console.error('Failed to mark request SentToHospital after payment', e)
          }
        }
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

export const getPaymentSummaryCountByHospital = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' })

    const Hospital = (await import('../models/Hospital.js')).default
    let hospital = await Hospital.findOne({ userId: req.user._id })
    if (!hospital) {
      hospital = await Hospital.findById(req.user._id).exec()
    }

    if (!hospital) {
      return res.status(200).json({ success: true, count: 0 })
    }

    const count = await Payment.countDocuments({ hospitalId: hospital._id })
    return res.status(200).json({ success: true, count })
  } catch (error) {
    console.error('getPaymentSummaryCountByHospital error:', error)
    return res.status(500).json({ success: false, message: 'Server error', error: error.message })
  }
}
