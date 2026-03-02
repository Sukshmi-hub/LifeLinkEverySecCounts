#!/usr/bin/env node
// backfill_patient_hospital_names.js
// One-time script to populate Request.patientHospitalName by resolving Patient.hospital -> Hospital.name

import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';
import Patient from '../src/models/Patient.js';
import Hospital from '../src/models/Hospital.js';

const run = async () => {
  await connectDB();
  console.log('Starting backfill: populate patientHospitalName on Requests and hospitalName on Patients');

  // First update Patients with hospitalName if missing
  const patientCursor = Patient.find({ $or: [ { hospitalName: { $exists: false } }, { hospitalName: '' } ] }).cursor();
  let pTotal = 0; let pUpdated = 0;
  try {
    for (let p = await patientCursor.next(); p != null; p = await patientCursor.next()) {
      pTotal++;
      try {
        const hid = p.hospital;
        if (!hid) continue;
        const hosp = await Hospital.findById(hid).lean();
        if (hosp && hosp.name) {
          p.hospitalName = hosp.name;
          await p.save();
          pUpdated++;
          console.log(`Patient ${p._id} updated hospitalName -> ${hosp.name}`);
        }
      } catch (e) {
        console.error('Failed updating patient', p._id, e && e.message ? e.message : e);
      }
    }
    console.log(`Patients: processed ${pTotal}, updated ${pUpdated}`);
  } catch (err) {
    console.error('Patient backfill failed', err);
  }

  // Now update Requests
  const cursor = Request.find({ $or: [ { patientHospitalName: { $exists: false } }, { patientHospitalName: '' } ] }).cursor();
  let updated = 0;
  let total = 0;
  try {
    for (let req = await cursor.next(); req != null; req = await cursor.next()) {
      total++;
      try {
        let hospId = req.hospitalId || null;
        // Prefer patient's admitted hospital
        if (req.patientId) {
          const p = await Patient.findById(req.patientId).lean();
          if (p && p.hospital) hospId = p.hospital;
        }
        if (!hospId) continue;
        const hosp = await Hospital.findById(hospId).lean();
        if (hosp && hosp.name) {
          req.patientHospitalName = hosp.name;
          await req.save();
          updated++;
          console.log(`Updated request ${req._id} -> ${hosp.name}`);
        }
      } catch (e) {
        console.error('Failed to update request', req._id, e && e.message ? e.message : e);
      }
    }
    console.log(`Done. Processed ${total} requests, updated ${updated} documents.`);
  } catch (err) {
    console.error('Backfill failed', err);
  } finally {
    process.exit(0);
  }
};

run();
