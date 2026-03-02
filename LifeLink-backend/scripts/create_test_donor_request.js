#!/usr/bin/env node
import { connectDB } from '../src/config/mongodb.js'
import mongoose from 'mongoose'
import Request from '../src/models/Request.js'

async function run() {
  try {
    await connectDB()
    const hospitalId = '6995ecc868cd8a05bb519206'
    const reqDoc = new Request({
      requestType: 'donor_registration',
      status: 'pending',
      donorId: null,
      organType: 'Kidney',
      bloodType: 'O+',
      hospitalId: hospitalId,
      requestedBy: new mongoose.Types.ObjectId(),
      message: 'Test donor created for UI verification'
    })
    await reqDoc.save()
    console.log('Created test donor request:', reqDoc._id)
    process.exit(0)
  } catch (e) {
    console.error('Failed to create test donor request', e)
    process.exit(1)
  }
}

run()
