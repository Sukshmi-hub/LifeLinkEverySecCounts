import dotenv from 'dotenv'
import { connectDB } from '../src/config/mongodb.js'
import Request from '../src/models/Request.js'
import Donor from '../src/models/Donor.js'
import { createCertificateForDonor } from '../src/controllers/certificateController.js'

dotenv.config()

const run = async () => {
  try {
    await connectDB()
    console.log('Connected to DB')

    const requests = await Request.find({ matchedDonor: { $ne: null } }).lean()
    console.log('Total matched requests:', requests.length)

    let created = 0
    for (const r of requests) {
      try {
        let donorId = null
        try {
          if (r.matchedDonor && r.matchedDonor.raw && r.matchedDonor.raw._resolvedDonor && r.matchedDonor.raw._resolvedDonor.id) donorId = r.matchedDonor.raw._resolvedDonor.id
          donorId = donorId || (r.donorId ? String(r.donorId) : null)
          donorId = donorId || (r.matchedDonor && (r.matchedDonor.donorId || r.matchedDonor._id) ? String(r.matchedDonor.donorId || r.matchedDonor._id) : null)
        } catch (e) {}

        if (!donorId && r.matchedDonor) {
          const candName = (r.matchedDonor.name || (r.matchedDonor.raw && r.matchedDonor.raw.name) || '')
          const candBlood = (r.matchedDonor.bloodType || (r.matchedDonor.raw && (r.matchedDonor.raw.blood_type || r.matchedDonor.raw.blood)) || '')
          if (candName && candName.trim()) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
            const q = { name: { $regex: `^${esc(candName.trim())}$`, $options: 'i' } }
            if (candBlood && candBlood.trim()) q.blood_type = candBlood.trim()
            const found = await Donor.findOne(q).lean()
            if (found && found._id) donorId = String(found._id)
          }
        }

        if (!donorId) continue

        const donorDoc = await Donor.findById(donorId).lean()
        if (!donorDoc) continue

        const donorName = donorDoc.name || donorDoc.fullName || ''
        const organOrBlood = r.matchedDonor && (r.matchedDonor.organOffered || r.matchedDonor.organType || r.matchedDonor.organ || r.matchedDonor.bloodType) || r.organType || r.bloodType || ''
        const hospitalName = (r.matchedDonor && (r.matchedDonor.senderHospitalName || r.matchedDonor.hospitalName)) || r.sentFromHospitalName || r.receivingHospitalName || r.patientHospitalName || ''

        const cert = await createCertificateForDonor({ donorId: donorDoc._id, donorUserId: donorDoc.userId || null, donorName, organOrBlood, dateOfDonation: new Date(), hospitalName })
        if (cert) {
          console.log('Created cert for donor', donorDoc._id, 'certId', cert._id)
          created++
        }
      } catch (e) {
        console.error('Error processing request', r._id, e)
      }
    }

    console.log('Done. Created certificates:', created)
    process.exit(0)
  } catch (err) {
    console.error('Script failed', err)
    process.exit(1)
  }
}

run()
