#!/usr/bin/env node
// backfill_fix_all_hospital_ids.js
// Find Request docs where certain hospital name fields contain ObjectId strings
// and replace them with the resolved Hospital.name

import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';
import Hospital from '../src/models/Hospital.js';

const isObjectIdString = (s) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

const run = async () => {
  await connectDB();
  console.log('Starting comprehensive backfill to resolve hospital ID strings to names on Request docs');

  const cursor = Request.find({
    $or: [
      { 'matchedDonor.hospitalName': { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
      { sentFromHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
      { receivingHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
      { patientHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } }
    ]
  }).cursor();

  let total = 0, updated = 0;
  try {
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      total++;
      let changed = false;
      try {
        // Helper to resolve id->name
        const resolveName = async (val) => {
          if (!val || !isObjectIdString(val)) return null;
          try {
            const h = await Hospital.findById(val).lean();
            if (h && h.name) return h.name;
            return null;
          } catch (e) { return null; }
        };

        // matchedDonor.hospitalName
        if (doc.matchedDonor && doc.matchedDonor.hospitalName && isObjectIdString(doc.matchedDonor.hospitalName)) {
          const nm = await resolveName(doc.matchedDonor.hospitalName);
          if (nm) { doc.matchedDonor.hospitalName = nm; changed = true; }
        }
        // sentFromHospitalName
        if (doc.sentFromHospitalName && isObjectIdString(doc.sentFromHospitalName)) {
          const nm = await resolveName(doc.sentFromHospitalName);
          if (nm) { doc.sentFromHospitalName = nm; changed = true; }
        }
        // receivingHospitalName
        if (doc.receivingHospitalName && isObjectIdString(doc.receivingHospitalName)) {
          const nm = await resolveName(doc.receivingHospitalName);
          if (nm) { doc.receivingHospitalName = nm; changed = true; }
        }
        // patientHospitalName
        if (doc.patientHospitalName && isObjectIdString(doc.patientHospitalName)) {
          const nm = await resolveName(doc.patientHospitalName);
          if (nm) { doc.patientHospitalName = nm; changed = true; }
        }

        // If matchedDonor.hospitalName is missing but matchedDonor.senderHospitalId exists
        if (doc.matchedDonor && (!doc.matchedDonor.hospitalName || doc.matchedDonor.hospitalName === '') && doc.matchedDonor.senderHospitalId) {
          try {
            const sh = await Hospital.findById(doc.matchedDonor.senderHospitalId).lean();
            if (sh && sh.name) { doc.matchedDonor.hospitalName = sh.name; changed = true; }
          } catch (e) {}
        }

        // If sentFromHospitalName is empty but matchedDonor.senderHospitalName exists and is id
        if ((!doc.sentFromHospitalName || doc.sentFromHospitalName === '') && doc.matchedDonor && doc.matchedDonor.senderHospitalName && isObjectIdString(doc.matchedDonor.senderHospitalName)) {
          const nm = await resolveName(doc.matchedDonor.senderHospitalName);
          if (nm) { doc.sentFromHospitalName = nm; changed = true; }
        }

        if (changed) {
          await doc.save();
          updated++;
          console.log(`Updated Request ${doc._id}`);
        }
      } catch (e) {
        console.error('Error processing request', doc._id, e && e.message ? e.message : e);
      }
    }
    console.log(`Done. Processed ${total} documents, updated ${updated} documents.`);

    // Final check: count remaining requests where any of those fields still look like 24-hex
    const remaining = await Request.countDocuments({
      $or: [
        { 'matchedDonor.hospitalName': { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
        { sentFromHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
        { receivingHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } },
        { patientHospitalName: { $type: 'string', $regex: '^[0-9a-fA-F]{24}$' } }
      ]
    });
    console.log('Remaining requests with ID-like hospital fields:', remaining);
  } catch (err) {
    console.error('Backfill failed', err);
  } finally {
    process.exit(0);
  }
}

run();
