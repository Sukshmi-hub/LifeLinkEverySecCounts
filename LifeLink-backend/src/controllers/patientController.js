// src/controllers/patientController.js
import User from '../models/User.js'
import Patient from '../models/Patient.js'
import Hospital from '../models/Hospital.js'

const isDigits = (v, len) => typeof v === 'string' && new RegExp(`^\\d{${len}}$`).test(v)

export const getMyPatientProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const patient = await Patient.findOne({ userId })
      .select('-password')
      .populate('hospital', 'name email phone hospital_type contact_phone address location')

    if (!patient) return res.status(404).json({ success: false, message: 'Profile not found' })

    const user = await User.findById(userId).select('-password')

    const payload = {
      id: user._id,
      fullName: patient.fullName || user.name,
      email: user.email,
      role: user.role,
      phone: patient.phone || user.phone || null,
      aadhaarNumber: patient.aadhaarNumber || null,
      age: patient.age || null,
      bloodGroup: patient.bloodGroup || null,
      location: patient.location || {},
      hospitalAdmittedIn: patient.hospital || null,
      emergencyContactName: patient.emergency_contact?.name || null,
      emergencyPhone: patient.emergency_contact?.phone || null,
      isVerifiedByHospital: patient.is_verified || false,
      verificationStatus: patient.verificationStatus || 'Pending'
    }

    return res.json({ success: true, message: 'Profile fetched successfully', data: payload })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const updateMyPatientProfile = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const patient = await Patient.findOne({ userId })
    if (!patient) return res.status(404).json({ success: false, message: 'Profile not found' })

    const {
      fullName,
      phone,
      age,
      bloodGroup,
      aadhaarNumber,
      hospitalAdmittedIn,
      emergencyContactName,
      emergencyPhone,
      location = {}
    } = req.body

    // Validation
    if (phone !== undefined && phone !== null && !isDigits(phone, 10)) {
      return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' })
    }
    if (age !== undefined && (typeof age !== 'number' || age < 0 || age > 110)) {
      return res.status(400).json({ success: false, message: 'Age must be between 0 and 110' })
    }
    if (aadhaarNumber !== undefined && aadhaarNumber !== null && !isDigits(aadhaarNumber, 12)) {
      return res.status(400).json({ success: false, message: 'Aadhaar must be exactly 12 digits' })
    }

    // Update User basic (name, phone) but NOT email/password
    const userUpdate = {}
    if (fullName !== undefined) userUpdate.name = fullName
    if (phone !== undefined) userUpdate.phone = phone
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(userId, userUpdate)

    // Update Patient
    const update = {}
    if (age !== undefined) update.age = age
    if (bloodGroup !== undefined) update.blood_type = bloodGroup
    if (aadhaarNumber !== undefined) update.aadhaar_no = aadhaarNumber
    if (hospitalAdmittedIn !== undefined) update.hospital = hospitalAdmittedIn
    if (emergencyContactName !== undefined || emergencyPhone !== undefined) {
      update.emergency_contact = patient.emergency_contact || {}
      if (emergencyContactName !== undefined) update.emergency_contact.name = emergencyContactName
      if (emergencyPhone !== undefined) update.emergency_contact.phone = emergencyPhone
    }
    if (location && Object.keys(location).length) {
      update.location = patient.location || {}
      for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
        if (location[key] !== undefined) update.location[key] = location[key]
      }
    }

    await Patient.findOneAndUpdate({ userId }, update, { new: true })

    const refreshed = await Patient.findOne({ userId }).select('-password').populate('hospital', 'name email phone hospital_type contact_phone address location')
    const result = {
      id: user._id,
      fullName: refreshed.fullName || user.name,
      email: user.email,
      role: user.role,
      phone: refreshed.phone || user.phone || null,
      aadhaarNumber: refreshed.aadhaarNumber || null,
      age: refreshed.age || null,
      bloodGroup: refreshed.bloodGroup || null,
      location: refreshed.location || {},
      hospitalAdmittedIn: refreshed.hospital || null,
      emergencyContactName: refreshed.emergency_contact?.name || null,
      emergencyPhone: refreshed.emergency_contact?.phone || null,
      isVerifiedByHospital: refreshed.is_verified || false,
      verificationStatus: refreshed.verificationStatus || 'Pending'
    }

    return res.json({ success: true, message: 'Profile updated successfully', data: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { getMyPatientProfile, updateMyPatientProfile }
