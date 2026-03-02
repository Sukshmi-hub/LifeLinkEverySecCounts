#!/usr/bin/env node
// scripts/add_patient_with_hospital.js
// Create a sample user + patient record linked to an existing hospital
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/mongodb.js';
import User from '../src/models/User.js';
import Patient from '../src/models/Patient.js';
import Hospital from '../src/models/Hospital.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  try {
    const hospitalId = process.env.TARGET_HOSPITAL_ID || '6995f8fe3f7f32d8a1179aae';
    const hosp = await Hospital.findById(hospitalId).lean();
    if (!hosp) {
      console.error('Hospital not found for id', hospitalId);
      process.exit(1);
    }

    // create a user
    const email = process.env.SAMPLE_PATIENT_EMAIL || `rahul+test${Date.now()}@gmail.com`;
    const password = process.env.SAMPLE_PATIENT_PASSWORD || 'Rahul12@';
    const name = process.env.SAMPLE_PATIENT_NAME || 'Rahul Sharma';

    let user = await User.findOne({ email }).exec();
    if (!user) {
      user = new User({ name, email, password, role: 'patient', phone: '9123409878', is_verified: false });
      await user.save();
      console.log('Created user', user._id.toString());
    } else {
      console.log('User already exists', user._id.toString());
    }

    // create or upsert patient
    let patient = await Patient.findOne({ userId: user._id }).exec();
    if (!patient) {
      patient = new Patient({
        userId: user._id,
        name,
        email,
        password,
        phone: '9123409878',
        aadhaar_no: '234567890123',
        age: 35,
        blood_type: 'O+',
        hospital: new mongoose.Types.ObjectId(hospitalId),
        hospitalName: hosp.name,
        location: { city: 'Jaipur', state: 'Rajasthan' }
      });
      await patient.save();
      console.log('Created patient', patient._id.toString());
    } else {
      console.log('Patient already exists, updating hospital fields');
      patient.hospital = new mongoose.Types.ObjectId(hospitalId);
      patient.hospitalName = hosp.name;
      await patient.save();
      console.log('Updated patient', patient._id.toString());
    }

    // print patient doc
    const p = await Patient.findById(patient._id).lean();
    console.log('Patient document:', p);
    process.exit(0);
  } catch (err) {
    console.error('Error creating patient:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

run();
