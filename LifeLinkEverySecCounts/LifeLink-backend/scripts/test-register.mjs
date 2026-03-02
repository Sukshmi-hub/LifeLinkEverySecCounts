import dotenv from 'dotenv'
import fetch from 'node-fetch'
import mongoose from 'mongoose'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LifeLinkdb'
const API_URL = process.env.API_URL || 'http://localhost:5000/api/auth/register'

const testUser = {
  name: 'Test User Auto',
  email: `test+${Date.now()}@example.com`,
  phone: '7000000000',
  password: 'TestPass123',
  role: 'patient',
  aadhaar_no: `${Date.now().toString().slice(-12)}`,
  age: 30,
  blood_type: 'A+'
}

async function run() {
  console.log('Posting registration to', API_URL)
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  })

  const body = await res.text()
  let result
  try { result = JSON.parse(body) } catch(e) { result = { raw: body } }

  console.log('Response status:', res.status)
  console.log('Response body:', result)

  if (!res.ok) {
    console.error('Registration failed; aborting DB check')
    process.exit(1)
  }

  // Wait a short moment for DB write to complete
  await new Promise(r => setTimeout(r, 500))

  // Connect to MongoDB and check patients collection
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to MongoDB for verification')

  const Patient = mongoose.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients')

  const found = await Patient.findOne({ aadhaar_no: testUser.aadhaar_no }).lean()

  if (!found) {
    console.error('Patient document not found in DB')
    process.exit(1)
  }

  console.log('Found patient document:')
  console.dir(found, { depth: null })

  // cleanup: remove created user and patient
  await mongoose.connection.collection('patients').deleteOne({ _id: found._id })
  console.log('Cleaned up patient doc')

  // Try to find user in users collection and remove
  const user = await mongoose.connection.collection('users').findOne({ aadhaar_no: testUser.aadhaar_no })
  if (user) {
    await mongoose.connection.collection('users').deleteOne({ _id: user._id })
    console.log('Cleaned up user doc')
  }

  await mongoose.disconnect()
  console.log('Test completed successfully')
}

run().catch(err => { console.error(err); process.exit(1) })
