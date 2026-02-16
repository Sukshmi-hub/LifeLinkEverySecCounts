// src/controllers/hospitalController.js
import User from '../models/User.js'
import Hospital from '../models/Hospital.js'
import Patient from '../models/Patient.js'

const isDigits = (v, len) => typeof v === 'string' && new RegExp(`^\\d{${len}}$`).test(v)

export const getMyHospitalProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const hospital = await Hospital.findOne({ userId }).select('-password')
    if (!hospital) return res.status(404).json({ success: false, message: 'Profile not found' })

    const user = await User.findById(userId).select('-password')

    const admitted_patients = await Patient.find({ hospital: hospital._id }).select('name email phone age blood_type aadhaar_no')

    const payload = {
      id: user._id,
      organizationName: hospital.organizationName || user.name,
      email: user.email,
      role: user.role,
      phone: hospital.phone || user.phone || null,
      hospitalType: hospital.hospital_type || '',
      hospitalContactPhone: hospital.hospitalContactPhone || '',
      registration_number: hospital.registration_number || null,
      hospitalFullAddress: hospital.hospitalFullAddress || '',
      working_hours: hospital.working_hours || null,
      location: hospital.location || {},
      admitted_patients
    }

    return res.json({ success: true, message: 'Profile fetched successfully', data: payload })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const updateMyHospitalProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const hospital = await Hospital.findOne({ userId })
    if (!hospital) return res.status(404).json({ success: false, message: 'Profile not found' })

    const { organizationName, phone, hospitalType, hospitalContactPhone, hospitalFullAddress, registration_number, working_hours, location = {} } = req.body

    // Validation
    if (phone !== undefined && phone !== null && !isDigits(phone, 10)) return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' })
    if (hospitalContactPhone !== undefined && hospitalContactPhone !== null && !isDigits(hospitalContactPhone, 10)) return res.status(400).json({ success: false, message: 'Hospital contact phone must be exactly 10 digits' })

    // Update User basic
    const userUpdate = {}
    if (organizationName !== undefined) userUpdate.name = organizationName
    if (phone !== undefined) userUpdate.phone = phone
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(userId, userUpdate)

    const update = {}
    if (hospitalType !== undefined) update.hospital_type = hospitalType
    if (hospitalContactPhone !== undefined) update.contact_phone = hospitalContactPhone
    if (hospitalFullAddress !== undefined) update.address = hospitalFullAddress
    if (registration_number !== undefined) update.registration_number = registration_number
    if (working_hours !== undefined) update.working_hours = working_hours
    if (location && Object.keys(location).length) {
      update.location = hospital.location || {}
      for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
        if (location[key] !== undefined) update.location[key] = location[key]
      }
    }

    await Hospital.findOneAndUpdate({ userId }, update, { new: true })

    const refreshed = await Hospital.findOne({ userId }).select('-password')
    const admitted_patients = await Patient.find({ hospital: refreshed._id }).select('name email phone age blood_type aadhaar_no')

    const result = {
      id: user._id,
      organizationName: refreshed.organizationName || user.name,
      email: user.email,
      role: user.role,
      phone: refreshed.phone || user.phone || null,
      hospitalType: refreshed.hospital_type || '',
      hospitalContactPhone: refreshed.contact_phone || '',
      registration_number: refreshed.registration_number || null,
      hospitalFullAddress: refreshed.address || '',
      working_hours: refreshed.working_hours || null,
      location: refreshed.location || {},
      admitted_patients
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { getMyHospitalProfile, updateMyHospitalProfile }
