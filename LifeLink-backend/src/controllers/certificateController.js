import Certificate from '../models/Certificate.js'
import Donor from '../models/Donor.js'
import mongoose from 'mongoose'

// Generate next certificate number for year
const generateCertificateNumber = async () => {
  const year = (new Date()).getFullYear()
  const prefix = `LL-CERT-${year}`
  const count = await Certificate.countDocuments({ certificateNumber: { $regex: `^${prefix}-` } })
  const seq = String(count + 1).padStart(5, '0')
  return `${prefix}-${seq}`
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

export const createCertificateForDonor = async ({ donorId, donorUserId, donorName, organOrBlood, dateOfDonation, hospitalName }) => {
  if (!donorId) return null
  const certNumber = await generateCertificateNumber()
  const html = buildCertificateHTML({ donorName, donorId: `LL-${String(donorId).slice(-6).toUpperCase()}`, organOrBlood, dateOfDonation, hospitalName, certificateNumber: certNumber })
  const cert = new Certificate({ donorId, donorUserId: donorUserId || null, donorName, organOrBlood, dateOfDonation: dateOfDonation || new Date(), hospitalName, certificateNumber: certNumber, html })
  await cert.save()
  // attach to donor
  try {
    await Donor.findByIdAndUpdate(donorId, { $push: { certificates: cert._id }, $set: { certificateStatus: 'Certificate Issued' } }, { new: true })
  } catch (e) {
    // ignore
  }
  return cert
}

export const getMyCertificates = async (req, res) => {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' })
    // find donor record for this user
    const donor = await Donor.findOne({ userId: user._id }).populate('certificates').lean()
    if (!donor) return res.json({ success: true, data: [] })
    return res.json({ success: true, data: donor.certificates || [] })
  } catch (err) {
    console.error('getMyCertificates failed', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const downloadCertificate = async (req, res) => {
  try {
    const id = req.params.id
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' })
    const cert = await Certificate.findById(id).lean()
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' })
    // Only allow donor owner or admin/hospital? For now, ensure authenticated donor owns it
    if (req.user && String(req.user._id)) {
      // find donor for this user
      const donor = await Donor.findOne({ userId: req.user._id }).lean()
      if (!donor || String(donor._id) !== String(cert.donorId)) return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    res.setHeader('Content-Type', 'text/html')
    return res.send(cert.html || '')
  } catch (err) {
    console.error('downloadCertificate failed', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export default {}
