#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';
import Hospital from '../src/models/Hospital.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node patch_matched_hospitalname_for_id.js <hospitalIdString>');
  process.exit(1);
}
(async () => {
  await connectDB();
  try {
    const hosp = await Hospital.findById(id).lean();
    const name = hosp && hosp.name ? hosp.name : null;
    if (!name) {
      console.error('Hospital not found for id', id);
      process.exit(2);
    }
    const res = await Request.updateMany({ 'matchedDonor.hospitalName': id }, { $set: { 'matchedDonor.hospitalName': name } });
    console.log('Updated', res.nModified || res.modifiedCount || 0, 'documents to set matchedDonor.hospitalName ->', name);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  } finally { process.exit(0); }
})();
