import express from 'express'
const router = express.Router()

router.get('/env', (req, res) => {
  // Do NOT return secrets. Return only existence flags and helpful hints.
  const hasKeyId = !!process.env.RAZORPAY_KEY_ID
  const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET
  const hint = hasKeyId && hasKeySecret
    ? 'Razorpay keys are present in process.env'
    : 'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET. Ensure .env in backend root and restart the server.'

  return res.json({ success: true, data: { hasKeyId, hasKeySecret, hint } })
})

export default router
