#!/usr/bin/env node
import { connectDB } from '../src/config/mongodb.js'
import Certificate from '../src/models/Certificate.js'
import Donor from '../src/models/Donor.js'

const run = async () => {
  await connectDB()
  console.log('Scanning certificates...')
  const all = await Certificate.find({}).lean()
  console.log(`Found ${all.length} certificates`)
  let attached = 0
  let updatedDonor = 0
  const errors = []
  for (const c of all) {
    try {
      let didAttach = false
      if (c.donorId) {
        const donor = await Donor.findById(c.donorId)
        if (donor) {
          const has = (donor.certificates || []).some(x => String(x) === String(c._id))
          if (!has) {
            donor.certificates = donor.certificates || []
            donor.certificates.push(c._id)
            donor.certificateStatus = 'Certificate Issued'
            await donor.save()
            updatedDonor++
          }
          didAttach = true
        }
      }
      if (!didAttach && c.donorUserId) {
        const donor = await Donor.findOne({ userId: c.donorUserId })
        if (donor) {
          const has = (donor.certificates || []).some(x => String(x) === String(c._id))
          if (!has) {
            donor.certificates = donor.certificates || []
            donor.certificates.push(c._id)
            donor.certificateStatus = 'Certificate Issued'
            await donor.save()
            updatedDonor++
          }
          didAttach = true
        }
      }
      if (!didAttach && c.donorName) {
        const q = { name: { $regex: `^${c.donorName.replace(/[.*+?^${}()|[\\]\\]/g,'\\\\$&')}$`, $options: 'i' } }
        const donor = await Donor.findOne(q)
        if (donor) {
          const has = (donor.certificates || []).some(x => String(x) === String(c._id))
          if (!has) {
            donor.certificates = donor.certificates || []
            donor.certificates.push(c._id)
            donor.certificateStatus = 'Certificate Issued'
            await donor.save()
            updatedDonor++
          }
          // update certificate donorId/donorUserId
          try {
            await Certificate.findByIdAndUpdate(c._id, { $set: { donorId: donor._id, donorUserId: donor.userId || null } })
          } catch (e) {}
          didAttach = true
        }
      }
      if (didAttach) attached++
    } catch (e) {
      errors.push({ id: String(c._id), err: e.message || String(e) })
    }
  }
  console.log('Done.')
  console.log({ total: all.length, attached, updatedDonor, errorsCount: errors.length })
  if (errors.length) console.log('Errors sample:', errors.slice(0,5))
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
