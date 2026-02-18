import express from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js'
import Request from '../models/Request.js'
import Patient from '../models/Patient.js'
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
    return res.status(201).json({ success: true, data: reqDoc })
  } catch (err) {
    console.error('Create request failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to create request' })
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
      const list = await Request.find({ hospitalId: queryHospitalId }).sort({ createdAt: -1 }).lean()
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
    let list = await Request.find({ patientId: patientIdToQuery }).sort({ createdAt: -1 }).lean()

    // If no requests found and the provided id looks like an account/user id, try resolving Patient by userId
    if ((!list || list.length === 0) && queryPatientId) {
      const potentialPatient = await Patient.findOne({ userId: queryPatientId })
      if (potentialPatient) {
        list = await Request.find({ patientId: potentialPatient._id }).sort({ createdAt: -1 }).lean()
      }
    }

    return res.json({ success: true, data: list })
  } catch (err) {
    console.error('Fetch requests failed:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' })
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