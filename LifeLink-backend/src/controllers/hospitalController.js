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
      hospitalId: hospital._id,
      organizationName: hospital.organizationName || user.name,
      email: user.email,
      role: user.role,
      phone: hospital.phone || user.phone || null,
      hospitalType: hospital.hospital_type || '',
      hospitalContactPhone: hospital.hospitalContactPhone || '',
      // Include payment config fields (server-only)
      razorpayLinkedAccountId: hospital.razorpayLinkedAccountId || hospital.razorpayAccountId || '',
      bankAccountHolderName: hospital.bankAccountHolderName || '',
      bankName: hospital.bankName || '',
      upiId: hospital.upiId || '',
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

    // Payment config fields (optional)
    const { razorpayLinkedAccountId, bankAccountHolderName, bankName, upiId } = req.body

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

    // Save payment config fields if provided
    if (razorpayLinkedAccountId !== undefined) update.razorpayLinkedAccountId = razorpayLinkedAccountId
    if (bankAccountHolderName !== undefined) update.bankAccountHolderName = bankAccountHolderName
    if (bankName !== undefined) update.bankName = bankName
    if (upiId !== undefined) update.upiId = upiId

    await Hospital.findOneAndUpdate({ userId }, update, { new: true })

    const refreshed = await Hospital.findOne({ userId }).select('-password')
    const admitted_patients = await Patient.find({ hospital: refreshed._id }).select('name email phone age blood_type aadhaar_no')

    const result = {
      id: user._id,
      hospitalId: refreshed._id,
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

// Public list of hospitals for dropdowns (authenticated)
export const listHospitals = async (req, res) => {
  try {
    const Hospital = (await import('../models/Hospital.js')).default
    const hospitals = await Hospital.find({}).select('organizationName name location address').lean()
    return res.json({ success: true, data: hospitals })
  } catch (err) {
    console.error('listHospitals error', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Get hospital inventory (organs/blood) for current hospital
export const getHospitalInventory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const hospital = await Hospital.findOne({ userId });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });

    const Inventory = (await import('../models/Inventory.js')).default;
    const items = await Inventory.find({ hospitalId: hospital._id, itemType: { $in: ['organ', 'blood'] } }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getHospitalInventory error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Public: get inventory for a hospital by id (no auth) - used by patient-facing pages
export const getPublicHospitalInventory = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    if (!hospitalId) return res.status(400).json({ success: false, message: 'Hospital id is required' });
    const HospitalModel = (await import('../models/Hospital.js')).default;
    const Inventory = (await import('../models/Inventory.js')).default;

    const hospital = await HospitalModel.findById(hospitalId);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const items = await Inventory.find({ hospitalId: hospital._id, itemType: { $in: ['organ', 'blood'] } }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getPublicHospitalInventory error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Public: get hospital details by id
export const getHospitalById = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    if (!hospitalId) return res.status(400).json({ success: false, message: 'Hospital id is required' });
    const HospitalModel = (await import('../models/Hospital.js')).default;
    const hospital = await HospitalModel.findById(hospitalId).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    return res.json({ success: true, data: hospital });
  } catch (err) {
    console.error('getHospitalById error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update multiple inventory items (upsert). Expects body.items = [{ organType, count }]
export const updateHospitalInventory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const hospital = await Hospital.findOne({ userId });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });

    const { items } = req.body;
    console.log('updateHospitalInventory called by user:', String(userId), 'items:', JSON.stringify(items).slice(0,200));
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items must be an array' });

    const Inventory = (await import('../models/Inventory.js')).default;
    const results = [];
    for (const it of items) {
      const count = Number(it.count) || 0;
      // Organ item (case-insensitive match, store canonical uppercase key)
      if (it.organType && String(it.organType).trim()) {
        const raw = String(it.organType || '').trim();
        const canonical = raw.toUpperCase();
        try {
          const updated = await Inventory.findOneAndUpdate(
            { hospitalId: hospital._id, itemType: 'organ', organType: { $regex: `^${raw}$`, $options: 'i' } },
            { $set: { count, organType: canonical, bloodType: '' } },
            { upsert: true, new: true }
          ).lean();
          results.push(updated);
        } catch (e) {
          // fallback to exact upsert
          const updated = await Inventory.findOneAndUpdate(
            { hospitalId: hospital._id, itemType: 'organ', organType: canonical },
            { $set: { count, organType: canonical, bloodType: '' } },
            { upsert: true, new: true }
          ).lean();
          results.push(updated);
        }
        continue;
      }
      // Blood item (case-insensitive match, store canonical uppercase key)
      if (it.bloodType && String(it.bloodType).trim()) {
        const raw = String(it.bloodType || '').trim();
        const canonical = raw.toUpperCase();
        try {
          const updated = await Inventory.findOneAndUpdate(
            { hospitalId: hospital._id, itemType: 'blood', bloodType: { $regex: `^${raw}$`, $options: 'i' } },
            { $set: { count, bloodType: canonical, organType: '' } },
            { upsert: true, new: true }
          ).lean();
          results.push(updated);
        } catch (e) {
          const updated = await Inventory.findOneAndUpdate(
            { hospitalId: hospital._id, itemType: 'blood', bloodType: canonical },
            { $set: { count, bloodType: canonical, organType: '' } },
            { upsert: true, new: true }
          ).lean();
          results.push(updated);
        }
        continue;
      }
      // ignore invalid entries
    }

    return res.json({ success: true, message: 'Inventory updated', data: results });
  } catch (err) {
    console.error('updateHospitalInventory error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get dashboard stats for a hospital (consolidated endpoint for 4 stat cards)
export const getHospitalStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    // Get current user's hospital
    const hospital = await Hospital.findOne({ userId });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });

    const hospitalId = hospital._id;
    const Request = (await import('../models/Request.js')).default;

    // Execute all 4 queries in parallel
    const [
      pendingRequests,
      redAlerts,
      pendingVerifications,
      matchedDonors
    ] = await Promise.all([
      // 1. Pending patient organ requests
      Request.countDocuments({
        requestType: 'organ_request',
        status: 'pending',
        hospitalId: hospitalId
      }),
      // 2. Red alerts (high urgency cases that are not resolved)
      Request.countDocuments({
        urgency: 'high',
        isResolved: false,
        hospitalId: hospitalId
      }),
      // 3. Pending verifications (user verification requests)
      Request.countDocuments({
        requestType: 'user_verification',
        status: 'pending',
        hospitalId: hospitalId
      }),
      // 4. Matched donors (requests with a matched donor)
      Request.countDocuments({
        hospitalId: hospitalId,
        matchedDonor: { $ne: null }
      })
    ]);

    return res.json({
      success: true,
      data: {
        pendingRequests,
        redAlerts,
        pendingVerifications,
        matchedDonors
      }
    });
  } catch (err) {
    console.error('getHospitalStats error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


export default { getMyHospitalProfile, updateMyHospitalProfile }
