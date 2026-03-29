import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Donor from '../models/Donor.js';
import Hospital from '../models/Hospital.js';
import Request from '../models/Request.js';

// Hospital request controller
export const getUserVerificationRequests = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });
    // Try to find hospital by userId or by _id (tolerate inconsistent references)
    let hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) {
      hospital = await Hospital.findById(req.user._id).exec();
    }

    if (!hospital) {
      // Still not found: return empty array rather than failing so UI can show helpful message
      console.warn('Hospital not found for user when fetching verification requests:', req.user._id);
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Accept requests where hospitalId matches hospital._id or (in case hospitalId was stored incorrectly) matches req.user._id
    const requests = await Request.find({
      requestType: 'user_verification',
      hospitalId: { $in: [hospital._id, req.user._id] }
    })
      .populate('requestedBy', 'name email role phone')
      // include location and phone so frontend can show address/phone in details
      .populate('patientId', 'name email aadhaar_no age blood_type location phone')
      .populate('donorId', 'name email aadhaar_no age blood_type')
      .sort({ createdAt: -1 });

    console.log(`Hospital ${hospital._id} - verification requests found:`, requests.length);
    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('getUserVerificationRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getPatientOrganRequests = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });
    const hospitalIdStr = String(hospital._id);

    let requests = await Request.find({
      requestType: 'organ_request',
      $or: [
        { hospitalId: hospital._id },
        { sentFromHospitalId: hospital._id },
      ],
    })
      .populate('patientId', 'name email age blood_type aadhaar_no location userId')
      .sort({ createdAt: -1 });

    // Keep matched requests visible only to the hospital that originated the match.
    requests = requests.filter((request) => {
      const targetHospitalId = String(request.hospitalId || '');
      const sourceHospitalId = String(request.sentFromHospitalId || '');
      if (request.detailsSentToPatientHospital) {
        return sourceHospitalId === hospitalIdStr || (!sourceHospitalId && targetHospitalId === hospitalIdStr);
      }
      return targetHospitalId === hospitalIdStr || sourceHospitalId === hospitalIdStr;
    });

    // Sort by urgency: critical, high, medium, low
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    requests = requests.sort((a, b) => {
      const pa = priority[a.urgency || 'medium'] ?? 2;
      const pb = priority[b.urgency || 'medium'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('getPatientOrganRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getDonorRegistrationRequests = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });

    // Exclude donor registration requests that have already been matched so hospitals only see available donors
    const requests = await Request.find({ requestType: 'donor_registration', hospitalId: hospital._id, status: { $ne: 'Donor Matched' } })
      // include phone and aadhaar_no so frontend can display them in details
      // ALSO include userId so frontend can report the donor to moderation system
      .populate('donorId', 'name email age blood_type donation_type address aadhaar_no phone location emergency_contact userId')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('getDonorRegistrationRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const approveRequest = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const requestId = req.params.id;
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });
    if (String(request.hospitalId) !== String(hospital._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your hospital' });

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    if (request.requestType === 'user_verification') {
      try {
        const user = await User.findById(request.requestedBy);
        if (user) {
          user.is_verified = true;
          await user.save();
        }
      } catch (userErr) {
        console.error('Failed to mark user verified:', userErr);
      }
    }

    // If hospital approves a donor registration request, increment inventory immediately
    if (request.requestType === 'donor_registration') {
      try {
        const Inventory = (await import('../models/Inventory.js')).default;
        const hospitalId = hospital._id;
        const inc = { $inc: { count: 1 } };

        if (request.organType) {
          // canonicalize organ type to uppercase to match normalized inventory keys
          const organKey = String(request.organType).toUpperCase();
          await Inventory.findOneAndUpdate(
            { hospitalId, itemType: 'organ', organType: organKey },
            inc,
            { upsert: true, new: true }
          );
        } else if (request.bloodType) {
          const bloodKey = String(request.bloodType).toUpperCase();
          await Inventory.findOneAndUpdate(
            { hospitalId, itemType: 'blood', bloodType: bloodKey },
            inc,
            { upsert: true, new: true }
          );
        }
      } catch (invErr) {
        console.error('Failed to increment inventory for approved donor registration:', invErr);
      }
    }

    return res.status(200).json({ success: true, message: 'Request approved successfully', data: request });
  } catch (error) {
    console.error('approveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Complete a donor registration (hospital signals donation completed) -> increment inventory
export const completeRequest = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const requestId = req.params.id;
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });
    if (String(request.hospitalId) !== String(hospital._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your hospital' });

    // Only donor_registration requests should be completed here
    if (request.requestType !== 'donor_registration') {
      return res.status(400).json({ success: false, message: 'Only donor registration requests can be completed via this endpoint' });
    }

    request.status = 'completed';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Increment inventory atomically (upsert)
    try {
      const Inventory = (await import('../models/Inventory.js')).default
      const query = { hospitalId: hospital._id }
      let update = { $inc: { count: 1 } }
      if (request.organType) {
        query.itemType = 'organ'
        query.organType = request.organType
      } else if (request.bloodType) {
        query.itemType = 'blood'
        query.bloodType = request.bloodType
      }
      if (query.itemType) {
        await Inventory.findOneAndUpdate(query, update, { upsert: true, new: true })
      }
    } catch (invErr) {
      console.error('Failed to update inventory after completing donation:', invErr)
    }

    return res.status(200).json({ success: true, message: 'Request completed and inventory updated', data: request });
  } catch (error) {
    console.error('completeRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}

export const rejectRequest = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const requestId = req.params.id;
    const { rejectionReason } = req.body;

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });
    if (String(request.hospitalId) !== String(hospital._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your hospital' });

    request.status = 'rejected';
    request.rejectionReason = rejectionReason || 'No reason provided';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({ success: true, message: 'Request rejected', data: request });
  } catch (error) {
    console.error('rejectRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getPendingRequestsCount = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' });

    const hospital = await Hospital.findOne({ userId: req.user._id });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' });

    const userVerification = await Request.countDocuments({ hospitalId: hospital._id, requestType: 'user_verification', status: 'pending' });
    const organRequests = await Request.countDocuments({ hospitalId: hospital._id, requestType: 'organ_request', status: 'pending' });
    const donorRegistration = await Request.countDocuments({ hospitalId: hospital._id, requestType: 'donor_registration', status: 'pending' });
    const total = userVerification + organRequests + donorRegistration;

    return res.status(200).json({
      success: true,
      data: {
        user_verification: userVerification,
        organ_requests: organRequests,
        donor_registration: donorRegistration,
        total,
      }
    });
  } catch (error) {
    console.error('getPendingRequestsCount error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const createOrganRequest = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role !== 'patient') return res.status(403).json({ success: false, message: 'Only patients can create organ requests' });

    const { hospitalId, organType, bloodType, urgency, message } = req.body;
    if (!hospitalId || !organType) return res.status(400).json({ success: false, message: 'hospitalId and organType are required' });

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const newRequest = new Request({
      requestType: 'organ_request',
      hospitalId,
      patientId: patient._id,
      requestedBy: req.user._id,
      organType,
      bloodType,
      urgency: urgency || 'medium',
      message,
      status: 'pending'
    });

    await newRequest.save();
    return res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    console.error('createOrganRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export default {
  getUserVerificationRequests,
  getPatientOrganRequests,
  getDonorRegistrationRequests,
  approveRequest,
  rejectRequest,
  getPendingRequestsCount,
  createOrganRequest,
};
