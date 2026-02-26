import express from 'express'
import dotenv from 'dotenv'
import Payment from '../models/Payment.js'

dotenv.config()

const router = express.Router()

// Initialize Razorpay using createRequire for compatibility with ESM
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let Razorpay
try {
  Razorpay = require('razorpay')
} catch (e) {
  Razorpay = null
}

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, hospitalId, patientId, summaryId } = req.body || {}
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'amount is required and must be > 0' })
    if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId is required' })
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId is required' })

    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_id || !key_secret) {
      console.error('Razorpay keys not configured properly')
      return res.status(500).json({ success: false, message: 'Razorpay keys not configured properly' })
    }

    if (!Razorpay) {
      // dynamic import fallback
      try {
        const mod = await import('razorpay')
        Razorpay = mod.default || mod
      } catch (e) {
        console.error('Razorpay SDK not installed or failed to import', e)
        return res.status(500).json({ success: false, message: 'Razorpay integration not available' })
      }
    }

    const razor = new Razorpay({ key_id, key_secret })

    const amountPaise = Math.round(Number(amount) * 100)
    const orderOptions = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    }

    let order
    try {
      order = await razor.orders.create(orderOptions)
    } catch (err) {
      console.error('Razorpay SDK order creation failed, attempting HTTP fallback', err && (err.response ? err.response.data : err))
      // Try direct HTTP fallback using axios with Basic Auth
      try {
        const axios = (await import('axios')).default
        const https = (await import('https')).default
        // Allow insecure TLS in development or when explicitly disabled via env
        const allowInsecure = process.env.NODE_ENV !== 'production' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
        const agent = new https.Agent({ rejectUnauthorized: !allowInsecure })
        const resp = await axios.post('https://api.razorpay.com/v1/orders', orderOptions, {
          auth: { username: key_id, password: key_secret },
          httpsAgent: agent,
          timeout: 10000
        })
        order = resp.data
      } catch (httpErr) {
        console.error('HTTP fallback to Razorpay failed', httpErr && (httpErr.response ? httpErr.response.data : httpErr.message))
        const statusCode = httpErr && (httpErr.response && httpErr.response.status) || (err && (err.statusCode || (err.response && err.response.status)))
        const message = (httpErr && httpErr.response && httpErr.response.data && (httpErr.response.data.error && httpErr.response.data.error.description || httpErr.response.data.description)) || (err && err.message) || 'Failed to create order'
        if (statusCode === 401) return res.status(401).json({ success: false, message })
        return res.status(502).json({ success: false, message })
      }
    }

    // Save local payment record (pending)
    try {
      const payment = new Payment({ hospitalId, patientId, orderId: order.id, amount: Number(amount), status: 'pending' })
      await payment.save()
    } catch (saveErr) {
      console.error('Failed to save payment record', saveErr)
      // don't block returning order to frontend
    }

    return res.json({ success: true, data: { id: order.id, amount: order.amount } })
  } catch (err) {
    console.error('create-order handler error', err)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

export default router
