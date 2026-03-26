#!/usr/bin/env node
// backfill_request_hospital_names.js
// Resolve sentFromHospitalName / receivingHospitalName and fallback hospitalId -> Hospital.name

import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';
import Hospital from '../src/models/Hospital.js';

const isObjectIdString = (s) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

const run = async () => {
  await connectDB();
  console.log('Starting backfill: resolve sentFromHospitalName/receivingHospitalName/hospitalId to names');

  const cursor = Request.find({ $or: [ { sentFromHospitalName: { $exists: true } }, { receivingHospitalName: { $exists: true } }, { hospitalId: { $exists: true } } ] }).cursor();
  let total = 0, updated = 0;
  try {
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      total++;
      let changed = false;
      try {
        // Resolve sentFromHospitalName if it's an ObjectId string
        if (doc.sentFromHospitalName && isObjectIdString(doc.sentFromHospitalName)) {
          try {
            const h = await Hospital.findById(doc.sentFromHospitalName).lean();
            if (h && h.name) {
              doc.sentFromHospitalName = h.name;
              changed = true;
            }
          } catch (e) {}
        }
        // Resolve receivingHospitalName if it's an ObjectId string
        if (doc.receivingHospitalName && isObjectIdString(doc.receivingHospitalName)) {
          try {
            const h2 = await Hospital.findById(doc.receivingHospitalName).lean();
            if (h2 && h2.name) {
              doc.receivingHospitalName = h2.name;
              changed = true;
            }
          } catch (e) {}
        }
        // If sentFromHospitalName empty and matchedDonor.senderHospitalId present, try that
        if ((!doc.sentFromHospitalName || doc.sentFromHospitalName === '') && doc.matchedDonor && doc.matchedDonor.senderHospitalId) {
          try {
            const sh = await Hospital.findById(doc.matchedDonor.senderHospitalId).lean();
            if (sh && sh.name) {
              doc.sentFromHospitalName = sh.name;
              changed = true;
            }
          } catch (e) {}
        }
        // If still missing, and hospitalId exists, try to set receivingHospitalName from hospitalId
        if ((!doc.receivingHospitalName || doc.receivingHospitalName === '') && doc.hospitalId) {
          try {
            const hh = await Hospital.findById(doc.hospitalId).lean();
            if (hh && hh.name) {
              doc.receivingHospitalName = hh.name;
              changed = true;
            }
          } catch (e) {}
        }

        if (changed) {
          await doc.save();
          updated++;
          console.log(`Updated Request ${doc._id}`);
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
