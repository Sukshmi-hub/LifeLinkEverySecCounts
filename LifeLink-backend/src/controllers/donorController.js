// src/controllers/donorController.js
import User from '../models/User.js'
import Donor from '../models/Donor.js'

const isDigits = (v, len) => typeof v === 'string' && new RegExp(`^\\d{${len}}$`).test(v)

export const getMyDonorProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const donor = await Donor.findOne({ userId }).select('-password')
    if (!donor) return res.status(404).json({ success: false, message: 'Profile not found' })

    const user = await User.findById(userId).select('-password')

    const payload = {
      id: user._id,
      fullName: donor.fullName || user.name,
      email: user.email,
      role: user.role,
      phone: donor.phone || user.phone || null,
      aadhaarNumber: donor.aadhaarNumber || null,
      age: donor.age || null,
      bloodGroup: donor.bloodGroup || null,
      address: donor.address || '',
      location: donor.location || {},
      emergencyContactName: donor.emergency_contact?.name || '',
      emergencyPhone: donor.emergency_contact?.phone || '',
      donationType: donor.donation_type || []
    }

    return res.json({ success: true, message: 'Profile fetched successfully', data: payload })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const updateMyDonorProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const donor = await Donor.findOne({ userId })
    if (!donor) return res.status(404).json({ success: false, message: 'Profile not found' })

    const {
      fullName,
      phone,
      age,
      bloodGroup,
      address,
      aadhaarNumber,
      emergencyContactName,
      emergencyPhone,
      donationType = [],
      location = {}
    } = req.body

    // Validation
    if (phone !== undefined && phone !== null && !isDigits(phone, 10)) return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' })
    if (age !== undefined && (typeof age !== 'number' || age < 18 || age > 70)) return res.status(400).json({ success: false, message: 'Age must be between 18 and 70' })
    if (aadhaarNumber !== undefined && aadhaarNumber !== null && !isDigits(aadhaarNumber, 12)) return res.status(400).json({ success: false, message: 'Aadhaar must be exactly 12 digits' })
    if (emergencyPhone !== undefined && emergencyPhone !== null && !isDigits(emergencyPhone, 10)) return res.status(400).json({ success: false, message: 'Emergency phone must be exactly 10 digits' })

    // Update user basic
    const userUpdate = {}
    if (fullName !== undefined) userUpdate.name = fullName
    if (phone !== undefined) userUpdate.phone = phone
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(userId, userUpdate)

    // Update donor
    const update = {}
    if (age !== undefined) update.age = age
    if (bloodGroup !== undefined) update.blood_type = bloodGroup
    if (aadhaarNumber !== undefined) update.aadhaar_no = aadhaarNumber
    if (address !== undefined) update.address = address
    if (donationType !== undefined) update.donation_type = donationType
    if (emergencyContactName !== undefined || emergencyPhone !== undefined) {
      update.emergency_contact = donor.emergency_contact || {}
      if (emergencyContactName !== undefined) update.emergency_contact.name = emergencyContactName
      if (emergencyPhone !== undefined) update.emergency_contact.phone = emergencyPhone
    }
    if (location && Object.keys(location).length) {
      update.location = donor.location || {}
      for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
        if (location[key] !== undefined) update.location[key] = location[key]
      }
    }

    await Donor.findOneAndUpdate({ userId }, update, { new: true })

    const refreshed = await Donor.findOne({ userId }).select('-password')
    const result = {
      id: user._id,
      fullName: refreshed.fullName || user.name,
      email: user.email,
      role: user.role,
      phone: refreshed.phone || user.phone || null,
      aadhaarNumber: refreshed.aadhaarNumber || null,
      age: refreshed.age || null,
      bloodGroup: refreshed.bloodGroup || null,
      address: refreshed.address || '',
      location: refreshed.location || {},
      emergencyContactName: refreshed.emergency_contact?.name || '',
      emergencyPhone: refreshed.emergency_contact?.phone || '',
      donationType: refreshed.donation_type || []
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { getMyDonorProfile, updateMyDonorProfile }
