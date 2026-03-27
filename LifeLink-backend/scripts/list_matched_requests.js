import dotenv from 'dotenv'
import { connectDB } from '../src/config/mongodb.js'
import Request from '../src/models/Request.js'
import Donor from '../src/models/Donor.js'

dotenv.config()

const run = async () => {
  try {
    await connectDB()
    console.log('Connected to DB')
    const requests = await Request.find({ matchedDonor: { $ne: null } }).lean()
    console.log('Total matched requests:', requests.length)
    for (const r of requests) {
      const id = r._id
      const md = r.matchedDonor || {}
      let donorId = null
      if (md.raw && md.raw._resolvedDonor && md.raw._resolvedDonor.id) donorId = md.raw._resolvedDonor.id
      donorId = donorId || (r.donorId ? String(r.donorId) : null)
      donorId = donorId || (md.donorId ? String(md.donorId) : null)
      console.log('Request', id.toString())
      console.log('  matchedDonor.name=', md.name, 'blood=', md.bloodType)
      console.log('  donorIdCandidate=', donorId)
      if (donorId) {
        const donor = await Donor.findById(donorId).lean()
        console.log('  donor record found=', !!donor, donor ? { id: donor._id, name: donor.name, certificates: (donor.certificates||[]).length } : '')
      }
    }
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
run()
