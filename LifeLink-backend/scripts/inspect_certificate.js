import { connectDB } from '../src/config/mongodb.js'
import Certificate from '../src/models/Certificate.js'

const id = process.argv[2] || '69c92660eb9e75634f784e55'

await connectDB()

try {
  const cert = await Certificate.findById(id).lean()
  if (!cert) {
    console.error('Certificate not found for id', id)
    process.exit(2)
  }
  // print key fields
  console.log('Certificate id:', cert._id)
  console.log('donorId:', cert.donorId)
  console.log('donorName:', cert.donorName)
  console.log('hospitalName:', cert.hospitalName)
  console.log('dateOfDonation:', cert.dateOfDonation)
  console.log('certificateNumber:', cert.certificateNumber)
  // optionally print a small slice of html
  if (cert.html) {
    const htmlSnippet = cert.html.replace(/\n/g, ' ').slice(0, 400)
    console.log('htmlSnippet:', htmlSnippet)
  }
  process.exit(0)
} catch (e) {
  console.error('Inspect failed', e)
  process.exit(1)
}
