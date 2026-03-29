import Certificate from '../models/Certificate.js'
import Donor from '../models/Donor.js'
import Request from '../models/Request.js'
import Patient from '../models/Patient.js'
import Hospital from '../models/Hospital.js'
import mongoose from 'mongoose'

// Generate next certificate number for year
const generateCertificateNumber = async () => {
  const year = (new Date()).getFullYear()
  const prefix = `LL-CERT-${year}`
  const count = await Certificate.countDocuments({ certificateNumber: { $regex: `^${prefix}-` } })
  const seq = String(count + 1).padStart(5, '0')
  return `${prefix}-${seq}`
}

const normalizeHospitalName = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.toLowerCase() === 'city general hospital') return ''
  return text
}

const resolveBestHospitalName = async ({ hospitalName, sourceRequestId = null, donorId = null, organOrBlood = '' }) => {
  const explicit = normalizeHospitalName(hospitalName)
  if (explicit) return explicit

  const tryResolveFromRequest = async (req) => {
    if (!req) return ''

    const candidates = [
      req.matchedDonor && req.matchedDonor.senderHospitalName,
      req.matchedDonor && req.matchedDonor.hospitalName,
      req.receivingHospitalName,
      req.patientHospitalName,
      req.hospitalName,
      req.sentFromHospitalName,
      req.matchedDonor && req.matchedDonor.patientHospitalName,
    ]
      .map(normalizeHospitalName)
      .filter(Boolean)

    if (candidates.length) return candidates[0]

    const hospitalIds = [
      req.receivingHospitalId,
      req.sentFromHospitalId,
      req.hospitalId,
      req.matchedDonor && req.matchedDonor.hospitalId,
    ].filter(Boolean)

    for (const hospitalId of hospitalIds) {
      try {
        const hospitalDoc = await Hospital.findById(hospitalId).lean()
        const hospitalResolved = normalizeHospitalName(hospitalDoc && (hospitalDoc.name || hospitalDoc.organizationName))
        if (hospitalResolved) return hospitalResolved
      } catch (err) {}
    }

    if (req.patientId) {
      try {
        const patientDoc = await Patient.findById(req.patientId).lean()
        const patientResolved = normalizeHospitalName(
          patientDoc && (
            patientDoc.hospitalName ||
            patientDoc.admittedHospital ||
            (patientDoc.hospital && (patientDoc.hospital.name || patientDoc.hospital.organizationName))
          )
        )
        if (patientResolved) return patientResolved
      } catch (err) {}
    }

    return ''
  }

  try {
    if (sourceRequestId) {
      const req = await Request.findById(sourceRequestId).lean()
      const resolved = await tryResolveFromRequest(req)
      if (resolved) return resolved
    }

    if (donorId) {
      const organNeedle = String(organOrBlood || '').trim()
      const requestQuery = {
        requestType: 'organ_request',
        matchedDonor: { $ne: null },
        $or: [
          { donorId },
          { 'matchedDonor.donorId': donorId },
          { 'matchedDonor.raw._resolvedDonor.id': donorId },
        ],
      }
      if (organNeedle) {
        requestQuery.$and = [
          {
            $or: [
              { organType: new RegExp(`^${organNeedle}$`, 'i') },
              { bloodType: new RegExp(`^${organNeedle}$`, 'i') },
              { 'matchedDonor.organType': new RegExp(`^${organNeedle}$`, 'i') },
              { 'matchedDonor.organOffered': new RegExp(`^${organNeedle}$`, 'i') },
              { 'matchedDonor.organ': new RegExp(`^${organNeedle}$`, 'i') },
              { 'matchedDonor.bloodType': new RegExp(`^${organNeedle}$`, 'i') },
            ],
          },
        ]
      }
      const req = await Request.findOne(requestQuery).sort({ updatedAt: -1, createdAt: -1 }).lean()
      const resolved = await tryResolveFromRequest(req)
      if (resolved) return resolved
    }

    return 'City General Hospital'
  } catch (err) {
    return 'City General Hospital'
  }
}

// Build HTML for certificate using provided data
const buildCertificateHTML = ({ donorName, donorId, organOrBlood, dateOfDonation, hospitalName, certificateNumber }) => {
  const dateStr = dateOfDonation ? new Date(dateOfDonation).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  // inline SVG for logo and stamp, use basic fonts and inline styles to match design
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificate</title><style>
  body{font-family: 'Georgia', serif;margin:0;padding:32px;background:white}
  .frame{border:8px solid #e11d2d;padding:28px;height:100%;box-sizing:border-box}
  .logo{display:flex;flex-direction:column;align-items:center}
  .logo .mark{width:56px;height:56px;background:#e11d2d;border-radius:10px;display:flex;align-items:center;justify-content:center}
  .logo .mark svg{fill:#fff}
  .logo .brand{font-weight:700;margin-top:8px}
  .tag{color:#888;font-size:11px;margin-top:2px}
  .divider{height:1px;background:#ddd;margin:18px 0}
  .subtle{color:#888;font-size:12px;letter-spacing:2px;text-align:center}
  .title{display:flex;justify-content:center;gap:8px;align-items:baseline;margin:12px 0}
  .title .a{font-size:28px;font-weight:700;color:#000}.title .b{font-size:28px;font-weight:700;color:#e11d2d}
  .donorName{font-style:italic;font-size:36px;text-align:center;margin:12px 0;font-family:'Times New Roman',serif}
  .donorId{color:#888;text-align:center;margin-bottom:18px}
  .bodyText{font-style:italic;text-align:center;color:#666;margin:18px 0}
  .three{display:flex;justify-content:space-between;margin-top:18px}
  .col{flex:1;text-align:center}
  .col .label{color:#e11d2d;text-transform:uppercase;font-size:12px;letter-spacing:1px}
  .col .val{font-weight:700;font-size:16px;margin-top:6px}
  .stamp{position:absolute;right:48px;bottom:48px;width:120px;height:120px;border-radius:999px;border:4px solid #e11d2d;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e11d2d;font-size:12px}
  .stamp .heart{font-size:24px}
  .container{position:relative}
  </style></head><body><div class="frame"><div class="container"><div class="logo"><div class="mark"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 21s-7-4.35-9-7.2C-1 7 6 3 12 8c6-5 13  -1 9 5.8C19 16.65 12 21 12 21z"></path></svg></div><div class="brand">LifeLink</div><div class="tag">EVERY SECOND COUNTS</div></div><div class="divider"></div><div class="subtle">THIS CERTIFICATE IS PRESENTED TO</div><div class="title"><div class="a">Certificate of</div><div class="b">Donation</div></div><div class="subtle" style="text-transform:uppercase;letter-spacing:4px">DONOR</div><div class="donorName">${donorName}</div><div class="donorId">ID: ${donorId}</div><div class="bodyText">In recognition of your selfless and generous act of donation, your gift has given someone a second chance at life.</div><div class="divider"></div><div class="three"><div class="col"><div class="label">Organ</div><div class="val">${organOrBlood || ''}</div></div><div class="col"><div class="label">Date</div><div class="val">${dateStr}</div></div><div class="col"><div class="label">Hospital</div><div class="val">${hospitalName || ''}</div></div></div><div class="stamp"><div class="heart">❤</div><div style="font-weight:700;margin-top:6px">LIFELINK</div><div style="font-size:10px">Official</div></div></div></div></body></html>`
}

export const createCertificateForDonor = async ({ donorId, donorUserId, donorName, organOrBlood, dateOfDonation, hospitalName, sourceRequestId = null }) => {
  if (!donorId) return null
  if (sourceRequestId) {
    const existing = await Certificate.findOne({ donorId, sourceRequestId }).lean()
    if (existing) return existing
  }
  const certNumber = await generateCertificateNumber()
  const resolvedHospitalName = await resolveBestHospitalName({ hospitalName, sourceRequestId, donorId, organOrBlood })
  const html = buildCertificateHTML({ donorName, donorId: `LL-${String(donorId).slice(-6).toUpperCase()}`, organOrBlood, dateOfDonation, hospitalName: resolvedHospitalName, certificateNumber: certNumber })
  const cert = new Certificate({ donorId, donorUserId: donorUserId || null, donorName, organOrBlood, dateOfDonation: dateOfDonation || new Date(), hospitalName: resolvedHospitalName, sourceRequestId: sourceRequestId || null, certificateNumber: certNumber, html })
  await cert.save()
  // attach to donor
  try {
    await Donor.findByIdAndUpdate(donorId, { $push: { certificates: cert._id }, $set: { certificateStatus: 'Certificate Issued' } }, { new: true })
  } catch (e) {
    // ignore
  }
  // emit socket event to donor user to notify new certificate
  try {
    if (donorUserId && global.__LIFELINK_IO) {
      const ioRef = global.__LIFELINK_IO
      const map = global.__LIFELINK_USER_SOCKET_MAP
      try {
        if (map && map.has(String(donorUserId))) {
          ioRef.to(map.get(String(donorUserId))).emit('certificates_updated', { certificateId: String(cert._id) })
        } else {
          // fallback broadcast to ensure clients pick up update
          ioRef.emit('certificates_updated', { userId: String(donorUserId), certificateId: String(cert._id) })
        }
      } catch (e) {}
    }
  } catch (e) {}
  return cert
}

export const getMyCertificates = async (req, res) => {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' })
    const userId = user._id || user.id || null

    // Find donor record for this user, but keep a few fallbacks because the
    // auth/profile payload shape has shifted in a few places across the app.
    let donor = null
    if (userId) {
      donor = await Donor.findOne({ userId }).lean()
    }
    if (!donor && user.email) {
      donor = await Donor.findOne({ email: String(user.email).toLowerCase() }).lean()
    }

    // Prefer the certificate collection directly so the UI always receives
    // full certificate documents instead of raw ObjectId refs.
    const queries = []
    if (donor && donor._id) queries.push({ donorId: donor._id })
    if (userId) queries.push({ donorUserId: userId })

    for (const query of queries) {
      const certificates = await Certificate.find(query).sort({ createdAt: -1 }).lean()
      if (certificates.length) {
        return res.json({ success: true, data: certificates })
      }
    }

    // If no direct certificate docs are found, resolve any stored certificate refs.
    if (donor && Array.isArray(donor.certificates) && donor.certificates.length) {
      const refs = donor.certificates.filter(Boolean)
      const objectIds = refs.filter((ref) => mongoose.Types.ObjectId.isValid(String(ref))).map((ref) => String(ref))
      if (objectIds.length) {
        const resolved = await Certificate.find({ _id: { $in: objectIds } }).sort({ createdAt: -1 }).lean()
        if (resolved.length) {
          return res.json({ success: true, data: resolved })
        }
      }
    }

    return res.json({ success: true, data: [] })
  } catch (err) {
    console.error('getMyCertificates failed', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const downloadCertificate = async (req, res) => {
  try {
    const id = req.params.id
    let cert = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      cert = await Certificate.findById(id).lean()
    }
    if (!cert) {
      cert = await Certificate.findOne({ certificateNumber: id }).lean()
    }
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' })
    // Only allow donor owner or admin/hospital? For now, ensure authenticated donor owns it
    if (req.user && String(req.user._id)) {
      // find donor for this user
      const donor = await Donor.findOne({ userId: req.user._id }).lean()
      if (!donor || String(donor._id) !== String(cert.donorId)) return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    res.setHeader('Content-Type', 'text/html')
    const resolvedHospitalName = await resolveBestHospitalName({
      hospitalName: cert.hospitalName,
      sourceRequestId: cert.sourceRequestId,
      donorId: cert.donorId,
      organOrBlood: cert.organOrBlood,
    })
    const html = buildCertificateHTML({
      donorName: cert.donorName,
      donorId: `LL-${String(cert.donorId).slice(-6).toUpperCase()}`,
      organOrBlood: cert.organOrBlood,
      dateOfDonation: cert.dateOfDonation || cert.issuedAt || cert.createdAt,
      hospitalName: resolvedHospitalName,
      certificateNumber: cert.certificateNumber,
    })
    return res.send(html || cert.html || '')
  } catch (err) {
    console.error('downloadCertificate failed', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export default {}
