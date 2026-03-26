#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../src/config/mongodb.js';
import Request from '../src/models/Request.js';

const isIdRegex = '^[0-9a-fA-F]{24}$';
(async () => {
  await connectDB();
  const fields = ['matchedDonor.hospitalName', 'sentFromHospitalName', 'receivingHospitalName', 'patientHospitalName', 'matchedDonor.senderHospitalName'];
  for (const f of fields) {
    const agg = [
      { $match: { [f]: { $type: 'string', $regex: isIdRegex } } },
      { $group: { _id: `$${f}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];
    const res = await Request.aggregate(agg).exec();
    console.log(`Field: ${f} — ${res.length} distinct ID-like values`);
    for (const r of res) console.log(' ', r._id, '->', r.count);
  }
  process.exit(0);
})();
