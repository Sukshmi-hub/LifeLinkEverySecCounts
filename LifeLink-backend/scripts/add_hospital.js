#!/usr/bin/env node
// scripts/add_hospital.js
// Simple script to insert a sample hospital if not present
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/mongodb.js';
import Hospital from '../src/models/Hospital.js';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  const name = process.env.SAMPLE_HOSPITAL_NAME || 'Apollo Hospital Jaipur';
  try {
    let hosp = await Hospital.findOne({ name }).lean();
    if (hosp) {
      console.log('Hospital already exists:', hosp._id.toString());
      process.exit(0);
    }

    const sample = new Hospital({
      userId: mongoose.Types.ObjectId(),
      name,
      email: process.env.SAMPLE_HOSPITAL_EMAIL || 'apollo@example.com',
      phone: process.env.SAMPLE_HOSPITAL_PHONE || '9123456789',
      address: process.env.SAMPLE_HOSPITAL_ADDRESS || 'Jaipur, Rajasthan',
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India'
      }
    });

    const saved = await sample.save();
    console.log('Inserted hospital _id:', saved._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Failed to insert hospital:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

run();
