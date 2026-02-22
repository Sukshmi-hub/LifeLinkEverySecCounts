import Request from '../models/Request.js'
import Donor from '../models/Donor.js'
import User from '../models/User.js'

// Create a donor registration intent (requestType: donor_registration)
export const createDonationIntent = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if ((req.user.role || '').toLowerCase() !== 'donor') return res.status(403).json({ success: false, message: 'Only donors can create intents' })

    const { organType, bloodType, hospitalId, message, files = {} } = req.body
    if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId is required' })

    const donor = await Donor.findOne({ userId: req.user._id })
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found' })

    const newReq = new Request({
      requestType: 'donor_registration',
      status: 'pending',
      donorId: donor._id,
      hospitalId,
      requestedBy: req.user._id,
      organType: organType || '',
      bloodType: bloodType || donor.blood_type || '',
      files,
      message: message || ''
    })

    await newReq.save()

    return res.status(201).json({ success: true, data: newReq })
  } catch (err) {
    console.error('createDonationIntent error', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { createDonationIntent }
