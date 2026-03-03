import express from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js'
import Request from '../models/Request.js'
import mongoose from 'mongoose'
import Patient from '../models/Patient.js'
import NGO from '../models/NGO.js'
import Notification from '../models/Notification.js'
import Donor from '../models/Donor.js'
import Message from '../models/Message.js'
import Hospital from '../models/Hospital.js'
const router = express.Router()

// Ensure uploads folder exists
const uploadsBase = path.join(process.cwd(), 'public', 'uploads', 'requests')
fs.mkdirSync(uploadsBase, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsBase),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
    cb(null, safe)
  }
})

// Send request to hospital payment queue (NGO action)
router.put('/:id/send-to-hospital', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (req.user.role !== 'ngo') return res.status(403).json({ success: false, message: 'Forbidden' })

    const ngo = await NGO.findOne({ userId: req.user._id }) || await NGO.findById(req.user._id)
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found for user' })

    const requestId = req.params.id
    // Validate ObjectId early to avoid Mongoose CastError
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      console.debug('Invalid request id provided to send-matched-details', { requestId })
      return res.status(400).json({ success: false, message: 'Invalid request id' })
    }
    const reqDoc = await Request.findById(requestId)
    if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

    if (String(reqDoc.ngoId) !== String(ngo._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your NGO' })

    // Mark as sent to hospital for payment processing
    reqDoc.status = 'SentToHospital'
    reqDoc.sentToHospitalAt = new Date()
    await reqDoc.save()

    return res.status(200).json({ success: true, message: 'Request sent to hospital', data: reqDoc })
  } catch (err) {
    console.error('Send to hospital failed:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Hospital sends matched donor details to the hospital where the patient is admitted
router.put('/:id/send-matched-details', authenticate, async (req, res) => {
  try {
    console.debug('PUT /api/requests/:id/send-matched-details called', { user: req.user && { id: req.user._id, role: req.user.role }, params: req.params })
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (String(req.user.role).toLowerCase() !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' })

    const hospital = await Hospital.findOne({ userId: req.user._id }) || await Hospital.findById(req.user._id)
    if (!hospital) {
      console.debug('Hospital not found for user', { userId: req.user._id })
      return res.status(404).json({ success: false, message: 'Hospital account not found for user' })
    }

    const requestId = req.params.id
    // validate id to avoid Mongoose CastError
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      console.debug('Invalid request id provided to send-matched-details', { requestId })
      return res.status(400).json({ success: false, message: 'Invalid request id' })
    }
    const reqDoc = await Request.findById(requestId)
    if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

    // Expect donor details in body
    const donorDetails = req.body?.donor || req.body?.donorDetails || req.body
    console.debug('Donor details payload keys:', { keys: donorDetails ? Object.keys(donorDetails) : null, user: req.user && { id: req.user._id, role: req.user.role }, requestId })
    if (!donorDetails || Object.keys(donorDetails).length === 0) {
      console.debug('Missing donor details in request body')
      return res.status(400).json({ success: false, message: 'Donor details required' })
    }

    // Attach matched donor details to the request and mark as matched
    // Store a sanitized subset of donor details to avoid storing large circular objects
    // compute a small JSON-safe snapshot of incoming donor details
    let rawSnapshot = null
    try {
      rawSnapshot = JSON.parse(JSON.stringify(donorDetails))
    } catch (e) {
      rawSnapshot = { note: 'snapshot_failed' }
    }

    const sanitizedDonor = {
      name: donorDetails.name || donorDetails.fullName || donorDetails.user?.name || donorDetails.requestedBy?.name || donorDetails.donorName || null,
      phone: donorDetails.phone || donorDetails.mobile || donorDetails.contact || donorDetails.user?.phone || null,
      bloodType: donorDetails.blood_type || donorDetails.bloodGroup || donorDetails.blood || null,
      organOffered: donorDetails.organType || donorDetails.organOffered || donorDetails.organ || null,
      hospitalName: donorDetails.hospitalName || donorDetails.hospital || null,
      // compact JSON-safe snapshot
      raw: rawSnapshot,
    }
    // Include sender hospital info on the sanitized donor snapshot so recipients can see who sent it
    try {
      sanitizedDonor.senderHospitalId = hospital && hospital._id ? hospital._id : null
      sanitizedDonor.senderHospitalName = hospital && hospital.name ? hospital.name : null
    } catch (e) {
      // ignore
    }
    reqDoc.matchedDonor = sanitizedDonor
    // Use an allowed enum value for `status` to avoid validation errors
    // The schema currently permits: 'pending', 'approved', 'rejected'
    reqDoc.status = 'approved'
    reqDoc.matchedAt = new Date()
    reqDoc.detailsSentToPatientHospital = true
    reqDoc.sentToPatientHospitalAt = new Date()
    await reqDoc.save()

    // Resolve the hospital where the patient is admitted (targetHospitalId).
    // Prefer reqDoc.hospitalId, fallback to Patient.hospital or Patient by requestedBy
    let targetHospitalId = reqDoc.hospitalId || null
    try {
      if (!targetHospitalId && reqDoc.patientId) {
        const p = await Patient.findById(reqDoc.patientId)
        if (p && p.hospital) targetHospitalId = p.hospital
      }
      if (!targetHospitalId && reqDoc.requestedBy) {
        const p2 = await Patient.findOne({ userId: reqDoc.requestedBy })
        if (p2 && p2.hospital) targetHospitalId = p2.hospital
      }
      // If we found a target hospital and request didn't have it, persist it for future clarity
      if (targetHospitalId && (!reqDoc.hospitalId || String(reqDoc.hospitalId) !== String(targetHospitalId))) {
        reqDoc.hospitalId = targetHospitalId
        await reqDoc.save()
      }
    } catch (e) {
      console.error('Failed to resolve target hospital for matched details', e)
    }

    // Persist a compact snapshot of the matched donor to Patient and the target Hospital records
    try {
      const snapshot = { requestId: reqDoc._id, donor: sanitizedDonor, matchedAt: reqDoc.matchedAt }
      if (reqDoc.patientId) {
        await Patient.findByIdAndUpdate(reqDoc.patientId, { $push: { matchedDonors: snapshot } }, { upsert: false })
      }
      if (targetHospitalId) {
        await Hospital.findByIdAndUpdate(targetHospitalId, { $push: { matchedDonors: snapshot } }, { upsert: false })
      }
    } catch (e) {
      console.error('Failed to persist matched donor snapshot to patient/hospital', e && e.stack ? e.stack : e)
    }

    // Persist notification to DB and emit event so hospital dashboards show a new incoming-match notification
    try {
      const notif = new Notification({
        title: 'New match request received',
        message: `New match request received from ${hospital && hospital.name ? hospital.name : 'another hospital'}`,
        type: 'info',
        targetRole: 'hospital',
        recipientHospitalId: targetHospitalId || null,
        requestId: reqDoc._id,
        senderHospitalId: hospital && hospital._id ? hospital._id : null,
        senderHospitalName: hospital && hospital.name ? hospital.name : ''
      })
      await notif.save()

      const io = global.__LIFELINK_IO
      const payload = {
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        targetRole: notif.targetRole,
        hospitalId: String(notif.recipientHospitalId || ''),
        requestId: String(notif.requestId || ''),
        senderHospitalId: notif.senderHospitalId ? String(notif.senderHospitalId) : null,
        senderHospitalName: notif.senderHospitalName || null,
        timestamp: notif.timestamp
      }
      if (io && typeof io.emit === 'function') io.emit('new_notification', payload)
    } catch (e) {
      console.error('Failed to emit notification event', e && e.stack ? e.stack : e)
    }

    // Create a lightweight message/notification so patient-hospital staff can see it in their chat/feeds
    try {
      const MessageMod = (await import('../models/Message.js')).default
      const roomId = `room_hospital_${targetHospitalId || reqDoc.hospitalId}_patient_${reqDoc.patientId || 'unknown'}`
      const msg = new MessageMod({ senderId: req.user._id, senderRole: 'hospital', roomId, content: `Matched donor details sent for request ${requestId}`, timestamp: new Date() })
      await msg.save()
    } catch (e) {
      console.error('Failed to create notification message for matched details', e)
    }

    // Create canonical chat message entries for donor<->hospital and donor<->patient rooms so chat lists surface correctly
    try {
      const donorIdCandidate = donorDetails && (donorDetails._id || donorDetails.donorId || donorDetails.userId || donorDetails.id || (donorDetails.user && donorDetails.user._id))
      const donorId = donorIdCandidate ? String(donorIdCandidate) : null
      const patientIdForRoom = reqDoc.patientId || null
      const MessageMod = (await import('../models/Message.js')).default

      if (donorId && targetHospitalId) {
        const roomHospitalDonor = `room_hospital_${targetHospitalId}_donor_${donorId}`
        const m1 = new MessageMod({ senderId: req.user._id, senderRole: 'hospital', roomId: roomHospitalDonor, content: `Donor matched for request ${requestId}`, timestamp: new Date() })
        await m1.save()

        if (patientIdForRoom) {
          const roomDonorPatient = `room_donor_${donorId}_patient_${patientIdForRoom}_hospital_${targetHospitalId}`
          const m2 = new MessageMod({ senderId: req.user._id, senderRole: 'hospital', roomId: roomDonorPatient, content: `Donor matched for patient ${patientIdForRoom}`, timestamp: new Date() })
          await m2.save()
        }
      }
    } catch (e) {
      console.error('Failed to create chat messages for donor/hospital rooms', e)
    }

    return res.status(200).json({ success: true, message: "Details sent to patient's hospital successfully", data: reqDoc })
  } catch (err) {
    console.error('Send matched details failed:', err && err.stack ? err.stack : err, { body: req.body, user: req.user && { id: req.user._id, role: req.user.role } })
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})
const upload = multer({ storage })

// Create a new organ request (must be authenticated as patient)
router.post('/', authenticate, upload.fields([
  { name: 'medicalReports', maxCount: 10 },
  { name: 'prescription', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'additionalDocs', maxCount: 10 },
]), async (req, res) => {
  try {
    const user = req.user
    // Support both multipart and json bodies
    const body = req.body || {}
    const organType = body.organType || body.organ || ''
    const urgency = body.urgency || 'Medium'
    const hospital = body.hospital || body.hospitalId || body.hospital_id
    const details = body.details || body.message || ''

    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' })
    if (!hospital) return res.status(400).json({ success: false, message: 'hospital id required' })

    // Resolve Patient document for this user to store the correct patientId reference
    let patientDoc = await Patient.findOne({ userId: user._id });
    const patientRefId = patientDoc ? patientDoc._id : null;
    const patientNameToStore = patientDoc?.name || user.name || user.fullName || (body.patientName || '')

    const reqDoc = new Request({
      requestType: 'organ_request',
      status: 'pending',
      patientId: patientRefId,
      patientName: patientNameToStore,
      organType: organType || '',
      urgency: (urgency || 'Medium').toLowerCase(),
      // mark as red alert when urgency explicitly high
      isRedAlert: ((urgency || 'Medium').toLowerCase() === 'high'),
      // persist patient's blood group and location snapshot if available
      bloodType: patientDoc?.blood_type || (body.bloodType || body.blood_type || ''),
      patientHospitalName: patientDoc?.hospitalName || body.patientHospitalName || '',
      patientLocation: (patientDoc && (patientDoc.location?.full_address || (patientDoc.location?.city ? `${patientDoc.location.city}${patientDoc.location?.state ? ', ' + patientDoc.location.state : ''}` : ''))) || (body.patientLocation || ''),
      hospitalId: hospital,
      requestedBy: user._id,
      message: details || '',
    })

    // If files were uploaded via multer, attach URLs to the request document
    if (req.files) {
      const baseUrl = '/uploads/requests'
      reqDoc.files = {}
      if (req.files.medicalReports) {
        reqDoc.files.medicalReports = req.files.medicalReports.map(f => `${baseUrl}/${f.filename}`)
      }
      if (req.files.prescription && req.files.prescription[0]) {
        reqDoc.files.prescription = `${baseUrl}/${req.files.prescription[0].filename}`
      }
      if (req.files.idProof && req.files.idProof[0]) {
        reqDoc.files.idProof = `${baseUrl}/${req.files.idProof[0].filename}`
      }
      if (req.files.additionalDocs) {
        reqDoc.files.additional = req.files.additionalDocs.map(f => `${baseUrl}/${f.filename}`)
      }
    }

    await reqDoc.save()
    // create an initial chat message so a room is available for patient<->hospital
    try {
      const patientIdForRoom = patientRefId || req.user._id
      const roomId = `room_hospital_${hospital}_patient_${patientIdForRoom}`
      const msg = new Message({ senderId: req.user._id, senderRole: 'patient', roomId, content: `Organ request: ${organType}. ${details || ''}`, timestamp: new Date() })
      await msg.save()
    } catch (e) {
      console.error('Failed to create chat message for organ request', e)
    }
    return res.status(201).json({ success: true, data: reqDoc })
  } catch (err) {
    console.error('Create request failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to create request' })
  }
})

// Fetch unresolved High-urgency (red) alerts for a hospital
// If caller is a hospital user, their hospital is used. Admins may pass ?hospitalId=
router.get('/red-alerts', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })

    let hospitalId = req.query.hospitalId || null
    if (String(req.user.role).toLowerCase() === 'hospital') {
      const hospital = await Hospital.findOne({ userId: req.user._id }) || await Hospital.findById(req.user._id)
      if (!hospital) return res.status(404).json({ success: false, message: 'Hospital account not found for user' })
      hospitalId = hospital._id
    } else {
      // only allow non-hospital callers if they are admin
      if (!hospitalId) return res.status(400).json({ success: false, message: 'hospitalId required' })
      if (String(req.user.role).toLowerCase() !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const alerts = await Request.find({ hospitalId, isRedAlert: true, isResolved: false }).sort({ createdAt: -1 }).lean()

    // enrich with patient phone and normalized fields for frontend
    const result = await Promise.all(alerts.map(async (a) => {
      let phone = null
      let blood = a.bloodType || a.blood || ''
      let location = a.patientLocation || ''
      try {
        if (a.patientId) {
          const p = await Patient.findById(a.patientId).lean()
          if (p) {
            phone = phone || p.phone || p.emergency_contact?.phone || null
            blood = blood || p.blood_type || ''
            if (!location) location = p.location?.full_address || (p.location?.city ? `${p.location.city}${p.location?.state ? ', ' + p.location.state : ''}` : '') || ''
          }
        }
      } catch (e) {
        // ignore
      }
      return {
        id: String(a._id),
        patientName: a.patientName || '',
        organNeeded: a.organType || '',
        bloodGroup: blood,
        hospital: a.patientHospitalName || '',
        location: location,
        contactNumber: phone || '',
        timeLogged: a.createdAt,
        criticality: (a.urgency || 'high').charAt(0).toUpperCase() + (a.urgency || 'high').slice(1),
        status: a.isResolved ? 'resolved' : 'active'
      }
    }))

    return res.status(200).json({ success: true, data: result })
  } catch (err) {
    console.error('Fetch red-alerts failed:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Mark a red alert request as resolved
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    // only hospital users for the hospital of the request (or admins) can resolve
    const requestId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ success: false, message: 'Invalid request id' })
    const reqDoc = await Request.findById(requestId)
    if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

    if (String(req.user.role).toLowerCase() === 'hospital') {
      const hospital = await Hospital.findOne({ userId: req.user._id }) || await Hospital.findById(req.user._id)
      if (!hospital) return res.status(404).json({ success: false, message: 'Hospital account not found for user' })
      if (!reqDoc.hospitalId || String(reqDoc.hospitalId) !== String(hospital._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your hospital' })
    } else if (String(req.user.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    reqDoc.isResolved = true
    reqDoc.isRedAlert = false
    await reqDoc.save()

    return res.status(200).json({ success: true, message: 'Request marked resolved', data: { id: String(reqDoc._id) } })
  } catch (err) {
    console.error('Resolve request failed:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Create a new fund request (financial assistance sent to an NGO)
router.post('/fund', authenticate, upload.fields([
  { name: 'medicalReports', maxCount: 10 },
  { name: 'prescription', maxCount: 1 },
  { name: 'rationCard', maxCount: 1 },
]), async (req, res) => {
  try {
    const user = req.user
    console.log('POST /api/requests/fund - incoming', { user: user?._id, headers: req.headers && { authorization: req.headers.authorization }, body: req.body, files: req.files })
    const body = req.body || {}
    const amount = parseFloat(body.amount || '0')
    const ngoId = body.ngoId || body.ngo_id || null
    const ngoName = body.ngoName || body.ngo_name || body.ngo || ''
    const message = body.message || body.description || ''

    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' })
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' })

    // Resolve Patient document for this user to store the correct patientId reference
    let patientDoc = await Patient.findOne({ userId: user._id });
    const patientRefId = patientDoc ? patientDoc._id : null;
    const patientNameToStore = patientDoc?.name || user.name || user.fullName || (body.patientName || '')

    const reqDoc = new Request({
      requestType: 'fund_request',
      status: 'pending',
      patientId: patientRefId,
      patientName: patientNameToStore,
      hospitalId: body.hospitalId || null,
      requestedBy: user._id,
      message,
      amount,
      ngoId: ngoId || null,
      ngoName: ngoName || ''
    })
    // If client provided a JSON breakdown, store it on the document for later display
    try {
      if (body.breakdown) {
        const parsed = typeof body.breakdown === 'string' ? JSON.parse(body.breakdown) : body.breakdown
        reqDoc.breakdown = {
          transplantFee: parsed.transplantFee ? Number(parsed.transplantFee) : 0,
          hospitalCharges: parsed.hospitalCharges ? Number(parsed.hospitalCharges) : 0,
          processingFee: parsed.processingFee ? Number(parsed.processingFee) : 0,
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    if (req.files) {
      const baseUrl = '/uploads/requests'
      reqDoc.files = reqDoc.files || {}
      if (req.files.medicalReports) {
        reqDoc.files.medicalReports = req.files.medicalReports.map(f => `${baseUrl}/${f.filename}`)
      }
      if (req.files.prescription && req.files.prescription[0]) {
        reqDoc.files.prescription = `${baseUrl}/${req.files.prescription[0].filename}`
      }
      if (req.files.rationCard && req.files.rationCard[0]) {
        reqDoc.files.rationCard = `${baseUrl}/${req.files.rationCard[0].filename}`
      }
    }

    await reqDoc.save()
    // create chat message for patient->NGO conversation if NGO provided
    try {
      const patientIdForRoom = patientRefId || req.user._id
      if (reqDoc.ngoId) {
        const roomId = `room_ngo_${reqDoc.ngoId}_patient_${patientIdForRoom}`
        const msg = new Message({ senderId: req.user._id, senderRole: 'patient', roomId, content: `Fund request: ₹${reqDoc.amount}. ${reqDoc.message || ''}`, timestamp: new Date() })
        await msg.save()
      }
    } catch (e) {
      console.error('Failed to create chat message for fund request', e)
    }
    return res.status(201).json({ success: true, data: reqDoc })
  } catch (err) {
    console.error('Create fund request failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to create fund request' })
  }
})

// Create a new donor registration / donation intent (donor submits intent)
router.post('/donor', authenticate, upload.fields([
  { name: 'medicalReports', maxCount: 10 },
  { name: 'idProof', maxCount: 1 },
  { name: 'additionalDocs', maxCount: 10 },
]), async (req, res) => {
  try {
    const user = req.user
    const body = req.body || {}
    const hospital = body.hospital || body.hospitalId || body.hospital_id
    const organType = body.organType || body.organ || ''
    const bloodType = body.bloodType || ''

    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' })
    if (!hospital) return res.status(400).json({ success: false, message: 'hospital id required' })

    // Try to find donor profile for this user. If missing, create a minimal donor document
    let donorDoc = await Donor.findOne({ userId: user._id })
    try {
      if (!donorDoc) {
        donorDoc = new Donor({
          userId: user._id,
          name: user.name || user.fullName || '',
          email: user.email || '',
          hospital: hospital || null
        })
        await donorDoc.save()
      } else {
        // If donor exists but hospital not set (or changed), persist the selected hospital
        if (!donorDoc.hospital || String(donorDoc.hospital) !== String(hospital)) {
          donorDoc.hospital = hospital
          await donorDoc.save()
        }
      }
    } catch (e) {
      console.error('Failed to ensure donor document exists/updated for donor registration', e)
    }

    const reqDoc = new Request({
      requestType: 'donor_registration',
      status: 'pending',
      donorId: donorDoc ? donorDoc._id : null,
      organType: organType || undefined,
      bloodType: bloodType || undefined,
      hospitalId: hospital,
      requestedBy: user._id,
      message: body.message || ''
    })

    if (req.files) {
      const baseUrl = '/uploads/requests'
      reqDoc.files = reqDoc.files || {}
      if (req.files.medicalReports) {
        reqDoc.files.medicalReports = req.files.medicalReports.map(f => `${baseUrl}/${f.filename}`)
      }
      if (req.files.idProof && req.files.idProof[0]) {
        reqDoc.files.idProof = `${baseUrl}/${req.files.idProof[0].filename}`
      }
      if (req.files.additionalDocs) {
        reqDoc.files.additional = req.files.additionalDocs.map(f => `${baseUrl}/${f.filename}`)
      }
    }

    await reqDoc.save()

    // Create a short chat message so hospital<->donor room exists
    try {
      const roomId = `room_hospital_${hospital}_donor_${reqDoc.donorId || req.user._id}`
      const MessageMod = (await import('../models/Message.js')).default
      const msg = new MessageMod({ senderId: req.user._id, senderRole: 'donor', roomId, content: `Donor registration: ${organType || bloodType || 'donation'}. ${reqDoc.message || ''}`, timestamp: new Date() })
      await msg.save()
    } catch (e) {
      console.error('Failed to create chat message for donor registration', e)
    }

    return res.status(201).json({ success: true, data: reqDoc })
  } catch (err) {
    console.error('Create donor registration failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to create donor registration' })
  }
})

// Get requests; supports filtering by patientId or hospitalId
router.get('/', optionalAuth, async (req, res) => {
  try {
    const user = req.user
    const queryPatientId = req.query.patientId || req.body.patientId
    const queryHospitalId = req.query.hospitalId || req.body.hospitalId

    // If hospitalId provided, return requests for that hospital
    if (queryHospitalId) {
      const list = await Request.find({ hospitalId: queryHospitalId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'name email phone age blood_type aadhaar_no location emergency_contact')
        .populate('hospitalId', 'name address phone contact_phone location')
        .lean()
      return res.json({ success: true, data: list })
    }

    // If ngoId provided, return requests for that NGO (fund requests sent to this NGO)
    const queryNgoId = req.query.ngoId || req.body.ngoId
    if (queryNgoId) {
      console.log('GET /api/requests - ngoId query', { ngoId: queryNgoId })
      // Try to query by ngo._id first
      let aja = queryNgoId
      // If not found, attempt to resolve NGO by userId (frontend may pass NGO's account id)
      let list = await Request.find({ ngoId: aja })
        .sort({ createdAt: -1 })
        .populate('patientId', 'name email phone age blood_type aadhaar_no location emergency_contact')
        .populate('hospitalId', 'name address phone contact_phone location')
        .lean()
      if ((!list || list.length === 0)) {
        try {
          const ngoDoc = await NGO.findOne({ userId: queryNgoId })
          if (ngoDoc) {
            list = await Request.find({ ngoId: ngoDoc._id }).sort({ createdAt: -1 }).lean()
          }
        } catch (e) {
          console.error('Failed to resolve NGO by userId', e)
        }
      }
      return res.json({ success: true, data: list })
    }

    // Support filtering by requestType or status directly (useful for admin/hospital UIs)
    const queryRequestType = req.query.requestType || req.body.requestType
    const queryStatus = req.query.status || req.body.status
    if (queryRequestType || queryStatus) {
      const q = {}
      if (queryRequestType) q.requestType = queryRequestType
      if (queryStatus) q.status = queryStatus
      const list = await Request.find(q)
        .sort({ createdAt: -1 })
        .populate('patientId', 'name email phone age blood_type aadhaar_no location emergency_contact')
        .populate('hospitalId', 'name address phone contact_phone location')
        .lean()
      return res.json({ success: true, data: list })
    }

    // When authenticated, find the patient's document id and query by that _id
    let patientIdToQuery = null
    if (user) {
      const p = await Patient.findOne({ userId: user._id })
      if (p) patientIdToQuery = p._id
    } else if (queryPatientId) {
      // frontend may pass either the Patient._id or the account/user id
      patientIdToQuery = queryPatientId
    }

    if (!patientIdToQuery) return res.status(400).json({ success: false, message: 'patientId required' })

    // First try to find requests directly by patientId (if it is a Patient._id)
    let list = await Request.find({ patientId: patientIdToQuery })
      .sort({ createdAt: -1 })
      .populate('patientId', 'name email phone age blood_type aadhaar_no location emergency_contact')
      .populate('hospitalId', 'name address phone contact_phone location')
      .lean()

    // If no requests found and the provided id looks like an account/user id, try resolving Patient by userId
    if ((!list || list.length === 0) && queryPatientId) {
      const potentialPatient = await Patient.findOne({ userId: queryPatientId })
      if (potentialPatient) {
        list = await Request.find({ patientId: potentialPatient._id })
          .sort({ createdAt: -1 })
          .populate('patientId', 'name email phone age blood_type aadhaar_no location emergency_contact')
          .populate('hospitalId', 'name address phone contact_phone location')
          .lean()
      }
    }

    return res.json({ success: true, data: list })
  } catch (err) {
    console.error('Fetch requests failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' })
  }
})

  // Approve a fund request (NGO action)
  router.put('/:id/approve', authenticate, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
      if (req.user.role !== 'ngo') return res.status(403).json({ success: false, message: 'Forbidden' })

      const ngo = await NGO.findOne({ userId: req.user._id }) || await NGO.findById(req.user._id)
      if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found for user' })

      const requestId = req.params.id
      const reqDoc = await Request.findById(requestId)
      if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

      if (String(reqDoc.ngoId) !== String(ngo._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your NGO' })

      reqDoc.status = 'Approved'
      reqDoc.reviewedBy = req.user._id
      reqDoc.reviewedAt = new Date()
      await reqDoc.save()

      return res.status(200).json({ success: true, message: 'Fund request approved', data: reqDoc })
    } catch (err) {
      console.error('Approve fund request failed:', err)
      return res.status(500).json({ success: false, message: 'Server error' })
    }
  })

  // Hospital verifies a fund request that was sent by NGO
  router.put('/:id/verify-by-hospital', authenticate, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
      // Only hospital role may verify
      if (req.user.role !== 'hospital') return res.status(403).json({ success: false, message: 'Forbidden' })

      const hospital = await (await import('../models/Hospital.js')).default.findOne({ userId: req.user._id }) || await (await import('../models/Hospital.js')).default.findById(req.user._id)
      if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found for user' })

      const requestId = req.params.id
      const reqDoc = await Request.findById(requestId)
      if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

      // ensure the request belongs to this hospital if hospitalId present
      if (reqDoc.hospitalId && String(reqDoc.hospitalId) !== String(hospital._id)) return res.status(403).json({ success: false, message: 'Request not for your hospital' })

      reqDoc.status = 'VerifiedByHospital'
      reqDoc.verifiedByHospitalAt = new Date()
      reqDoc.verifiedByHospitalId = hospital._id
      await reqDoc.save()

      return res.status(200).json({ success: true, message: 'Request verified by hospital', data: reqDoc })
    } catch (err) {
      console.error('Hospital verify request failed:', err)
      return res.status(500).json({ success: false, message: 'Server error' })
    }
  })

  // Reject a fund request (NGO action)
  router.put('/:id/reject', authenticate, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
      if (req.user.role !== 'ngo') return res.status(403).json({ success: false, message: 'Forbidden' })

      const ngo = await NGO.findOne({ userId: req.user._id }) || await NGO.findById(req.user._id)
      if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found for user' })

      const requestId = req.params.id
      const { rejectionReason } = req.body
      const reqDoc = await Request.findById(requestId)
      if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' })

      if (String(reqDoc.ngoId) !== String(ngo._id)) return res.status(403).json({ success: false, message: 'Request does not belong to your NGO' })

      reqDoc.status = 'Rejected'
      reqDoc.rejectionReason = rejectionReason || 'Rejected by NGO'
      reqDoc.reviewedBy = req.user._id
      reqDoc.reviewedAt = new Date()
      await reqDoc.save()

      return res.status(200).json({ success: true, message: 'Fund request rejected', data: reqDoc })
    } catch (err) {
      console.error('Reject fund request failed:', err)
      return res.status(500).json({ success: false, message: 'Server error' })
    }
  })

// Dashboard counts for patient (auth optional, can pass patientId)
router.get('/dashboard', optionalAuth, async (req, res) => {
  try {
    const user = req.user
    const queryPatientId = req.query.patientId || req.body.patientId

    // Resolve patient id from authenticated user if present
    let patientIdToQuery = null
    if (user) {
      const p = await Patient.findOne({ userId: user._id })
      if (p) patientIdToQuery = p._id
    } else if (queryPatientId) {
      patientIdToQuery = queryPatientId
    }

    if (!patientIdToQuery) return res.status(400).json({ success: false, message: 'patientId required' })

    const total = await Request.countDocuments({ patientId: patientIdToQuery })
    const pending = await Request.countDocuments({ patientId: patientIdToQuery, status: 'pending' })
    const matched = await Request.countDocuments({ patientId: patientIdToQuery, status: { $in: ['Accepted', 'Donor Matched'] } })
    const emergencies = await Request.countDocuments({ patientId: patientIdToQuery, urgency: 'high' })

    return res.json({ success: true, data: { activeRequests: total, pending, matched, emergencies } })
  } catch (err) {
    console.error('Dashboard counts failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard counts' })
  }
})

export default router