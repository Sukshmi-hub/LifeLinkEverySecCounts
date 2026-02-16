// src/controllers/ngoController.js
import User from '../models/User.js'
import NGO from '../models/NGO.js'

const isDigits = (v, len) => typeof v === 'string' && new RegExp(`^\\d{${len}}$`).test(v)

export const getMyNgoProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const ngo = await NGO.findOne({ userId }).select('-password')
    if (!ngo) return res.status(404).json({ success: false, message: 'Profile not found' })

    const user = await User.findById(userId).select('-password')

    const payload = {
      id: user._id,
      organizationName: ngo.organizationName || user.name,
      email: user.email,
      role: user.role,
      phone: ngo.phone || user.phone || null,
      ngoContactPhone: ngo.ngo_contact_phone || '',
      registration_number: ngo.registration_number || null,
      ngoRegisteredOfficeAddress: ngo.registered_office_address || '',
      location: ngo.location || {},
      mission_statement: ngo.mission_statement || ''
    }

    return res.json({ success: true, message: 'Profile fetched successfully', data: payload })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const updateMyNgoProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const ngo = await NGO.findOne({ userId })
    if (!ngo) return res.status(404).json({ success: false, message: 'Profile not found' })

    const { organizationName, phone, ngoContactPhone, ngoRegisteredOfficeAddress, registration_number, mission_statement, location = {} } = req.body

    // Validation
    if (phone !== undefined && phone !== null && !isDigits(phone, 10)) return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' })
    if (ngoContactPhone !== undefined && ngoContactPhone !== null && !isDigits(ngoContactPhone, 10)) return res.status(400).json({ success: false, message: 'NGO contact phone must be exactly 10 digits' })

    // Update User basic
    const userUpdate = {}
    if (organizationName !== undefined) userUpdate.name = organizationName
    if (phone !== undefined) userUpdate.phone = phone
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(userId, userUpdate)

    const update = {}
    if (ngoContactPhone !== undefined) update.ngo_contact_phone = ngoContactPhone
    if (ngoRegisteredOfficeAddress !== undefined) update.registered_office_address = ngoRegisteredOfficeAddress
    if (registration_number !== undefined) update.registration_number = registration_number
    if (mission_statement !== undefined) update.mission_statement = mission_statement
    if (location && Object.keys(location).length) {
      update.location = ngo.location || {}
      for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
        if (location[key] !== undefined) update.location[key] = location[key]
      }
    }

    await NGO.findOneAndUpdate({ userId }, update, { new: true })

    const refreshed = await NGO.findOne({ userId }).select('-password')
    const result = {
      id: user._id,
      organizationName: refreshed.organizationName || user.name,
      email: user.email,
      role: user.role,
      phone: refreshed.phone || user.phone || null,
      ngoContactPhone: refreshed.ngo_contact_phone || '',
      registration_number: refreshed.registration_number || null,
      ngoRegisteredOfficeAddress: refreshed.registered_office_address || '',
      location: refreshed.location || {},
      mission_statement: refreshed.mission_statement || ''
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { getMyNgoProfile, updateMyNgoProfile }
