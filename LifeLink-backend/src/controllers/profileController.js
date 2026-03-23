// src/controllers/profileController.js
import User from '../models/User.js'
import Patient from '../models/Patient.js'
import Donor from '../models/Donor.js'
import Hospital from '../models/Hospital.js'
import NGO from '../models/NGO.js'
import Admin from '../models/Admin.js'

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    let profileData = null

    switch (user.role) {
      case 'patient': {
        const patient = await Patient.findOne({ userId }).populate('hospital')
        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' })
        // Compose frontend-friendly patient profile
        profileData = {
          id: user._id,
          fullName: patient.name || '',
          email: user.email || '',
          phone: patient.phone || user.phone || '',
          location: patient.location && (patient.location.city || patient.location.state) ? {
            city: patient.location.city || '',
            state: patient.location.state || '',
            latitude: patient.location.latitude || '',
            longitude: patient.location.longitude || '',
            full_address: patient.location.full_address || '',
            country: patient.location.country || ''
          } : 'Not set',
          accountId: user._id,
          status: (patient.status || 'Active').charAt(0).toUpperCase() + (patient.status || 'Active').slice(1),
          verified: user.is_verified ? 'Yes' : 'No',
          // Add more fields as needed for your UI
        }
        break
      }
      case 'donor': {
        const donor = await Donor.findOne({ userId })
        if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found' })
        profileData = donor
        break
      }
      case 'hospital': {
        const hospital = await Hospital.findOne({ userId })
        if (!hospital) return res.status(404).json({ success: false, message: 'Hospital profile not found' })
        const admitted_patients = await Patient.find({ hospital: hospital._id })
          .select('name email phone age blood_type aadhaar_no')
        profileData = { ...hospital.toObject(), admitted_patients }
        break
      }
      case 'ngo': {
        const ngo = await NGO.findOne({ userId })
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' })
        profileData = ngo
        break
      }
      case 'admin': {
        const admin = await Admin.findOne({ userId })
        if (!admin) {
          // If no Admin document exists, return basic user profile
          profileData = {
            id: user._id,
            fullName: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role,
            verified: user.is_verified ? 'Yes' : 'No'
          }
        } else {
          profileData = {
            id: user._id,
            fullName: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role,
            verified: user.is_verified ? 'Yes' : 'No',
            admin_level: admin.admin_level || '',
            department: admin.department || '',
            permissions: admin.permissions || [],
            is_active: admin.is_active || true
          }
        }
        break
      }
      default:
        return res.status(400).json({ success: false, message: 'Invalid user role' })
    }

    return res.json({ success: true, data: { user: profileData } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id
    const { name, phone } = req.body

    // Update User model
    if (name !== undefined || phone !== undefined) {
      const userUpdate = {}
      if (name !== undefined) userUpdate.name = name
      if (phone !== undefined) userUpdate.phone = phone
      await User.findByIdAndUpdate(userId, userUpdate)
    }

    // Get user role
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    switch (user.role) {
      case 'patient': {
        const {
          age, blood_type, hospital,
          emergency_contact_name, emergency_contact_phone,
          location = {}
        } = req.body
        const update = {}
        if (age !== undefined) update.age = age
        if (blood_type !== undefined) update.blood_type = blood_type
        if (hospital !== undefined) update.hospital = hospital
        if (emergency_contact_name !== undefined || emergency_contact_phone !== undefined) {
          update.emergency_contact = {}
          if (emergency_contact_name !== undefined) update.emergency_contact.name = emergency_contact_name
          if (emergency_contact_phone !== undefined) update.emergency_contact.phone = emergency_contact_phone
        }
        // Update location fields individually
        for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
          if (location[key] !== undefined) update[`location.${key}`] = location[key]
        }
        await Patient.findOneAndUpdate({ userId }, update)
        break
      }
      case 'donor': {
        const { age, blood_type, address, emergency_contact = {}, location = {} } = req.body
        const update = {}
        if (age !== undefined) update.age = age
        if (blood_type !== undefined) update.blood_type = blood_type
        if (address !== undefined) update.address = address
        if (emergency_contact.name !== undefined || emergency_contact.phone !== undefined) {
          update.emergency_contact = {}
          if (emergency_contact.name !== undefined) update.emergency_contact.name = emergency_contact.name
          if (emergency_contact.phone !== undefined) update.emergency_contact.phone = emergency_contact.phone
        }
        for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
          if (location[key] !== undefined) update[`location.${key}`] = location[key]
        }
        await Donor.findOneAndUpdate({ userId }, update)
        break
      }
      case 'hospital': {
        const { hospital_type, contact_phone, address, registration_number, working_hours, location = {} } = req.body
        const update = {}
        if (hospital_type !== undefined) update.hospital_type = hospital_type
        if (contact_phone !== undefined) update.contact_phone = contact_phone
        if (address !== undefined) update.address = address
        if (registration_number !== undefined) update.registration_number = registration_number
        if (working_hours !== undefined) update.working_hours = working_hours
        for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
          if (location[key] !== undefined) update[`location.${key}`] = location[key]
        }
        await Hospital.findOneAndUpdate({ userId }, update)
        break
      }
      case 'ngo': {
        const { ngo_contact_phone, registered_office_address, registration_number, mission_statement, location = {} } = req.body
        const update = {}
        if (ngo_contact_phone !== undefined) update.ngo_contact_phone = ngo_contact_phone
        if (registered_office_address !== undefined) update.registered_office_address = registered_office_address
        if (registration_number !== undefined) update.registration_number = registration_number
        if (mission_statement !== undefined) update.mission_statement = mission_statement
        for (const key of ['city', 'state', 'latitude', 'longitude', 'full_address', 'country']) {
          if (location[key] !== undefined) update[`location.${key}`] = location[key]
        }
        await NGO.findOneAndUpdate({ userId }, update)
        break
      }
      case 'admin': {
        // Admin profile updates (if needed in future)
        // For now, only allow basic user updates (name, phone) via User.findByIdAndUpdate above
        break
      }
      default:
        return res.status(400).json({ success: false, message: 'Invalid user role' })
    }

    // Return updated profile
    req.user = { _id: userId } // ensure getProfile works
    return await getProfile(req, res)
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}