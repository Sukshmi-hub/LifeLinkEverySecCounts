#!/usr/bin/env node
import dotenv from 'dotenv'
import mongoose from '../src/config/mongodb.js'
import { connectDB } from '../src/config/mongodb.js'
import Tribute from '../src/models/Tribute.js'

dotenv.config()

const sample = {
  donorName: 'Seed Donor',
  age: 60,
  location: 'Lat:12.9716, Lon:77.5946',
  donationType: 'Kidney',
  hospitalName: 'Seed Hospital',
  aboutDonor: 'This donor gave life and hope. Seeded via script for testing purposes.',
  photoUrl: '',
  isPublic: true,
  hospitalId: new mongoose.Types.ObjectId(),
}

const run = async () => {
  await connectDB()
  const doc = new Tribute(sample)
  const saved = await doc.save()
  console.log('Inserted tribute id=', saved._id.toString())
  process.exit(0)
}

run().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
