#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';

const idToFind = process.argv[2];
(async () => {
  await connectDB();
  if (!idToFind) {
    console.log('Usage: node find_requests_with_hospitalid.js <idString>');
    process.exit(1);
  }
  const docs = await Request.find({ $or: [ { 'matchedDonor.hospitalName': idToFind }, { sentFromHospitalName: idToFind }, { receivingHospitalName: idToFind } ] }).lean();
  console.log(`Found ${docs.length} documents for id ${idToFind}`);
  for (const d of docs) {
    console.log('---');
    console.log('Request _id:', d._id);
    console.log('patientName:', d.patientName);
    console.log('matchedDonor.hospitalName:', d.matchedDonor && d.matchedDonor.hospitalName);
    console.log('sentFromHospitalName:', d.sentFromHospitalName);
    console.log('receivingHospitalName:', d.receivingHospitalName);
  }
  process.exit(0);
})();
