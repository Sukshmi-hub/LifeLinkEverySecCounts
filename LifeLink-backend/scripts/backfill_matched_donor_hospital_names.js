#!/usr/bin/env node
// backfill_matched_donor_hospital_names.js
// One-time script to replace matchedDonor.hospitalName when it's an ObjectId string with the hospital's name

import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';
import Hospital from '../src/models/Hospital.js';

const isObjectIdString = (s) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

const run = async () => {
  await connectDB();
  console.log('Starting backfill: resolve matchedDonor.hospitalName ObjectIds to Hospital.name');
  const cursor = Request.find({ 'matchedDonor.hospitalName': { $exists: true, $ne: '' } }).cursor();
  let total = 0, updated = 0;
  try {
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      total++;
      try {
        const md = doc.matchedDonor;
        if (!md || !md.hospitalName) continue;
        if (isObjectIdString(md.hospitalName)) {
          try {
            const hosp = await Hospital.findById(md.hospitalName).lean();
            if (hosp && hosp.name) {
              doc.matchedDonor.hospitalName = hosp.name;
              await doc.save();
              updated++;
              console.log(`Updated Request ${doc._id} matchedDonor.hospitalName -> ${hosp.name}`);
            } else {
              // if not found, try fallback using hospitalId fields
              if (doc.matchedDonor && doc.matchedDonor.senderHospitalId) {
                try {
                  const sh = await Hospital.findById(doc.matchedDonor.senderHospitalId).lean();
                  if (sh && sh.name) {
                    doc.matchedDonor.hospitalName = sh.name;
                    await doc.save();
                    updated++;
                    console.log(`Updated Request ${doc._id} matchedDonor.hospitalName from senderHospitalId -> ${sh.name}`);
                  }
                } catch (e) {}
              }
            }
          } catch (e) {
            console.error('Failed to resolve hospital for request', doc._id, e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        console.error('Failed processing request', doc._id, e && e.message ? e.message : e);
      }
    }
    console.log(`Done. Processed ${total} requests, updated ${updated} documents.`);
  } catch (err) {
    console.error('Backfill failed', err);
  } finally {
    process.exit(0);
  }
}

run();
