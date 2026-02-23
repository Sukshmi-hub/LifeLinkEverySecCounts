#!/usr/bin/env node
// scripts/normalize_inventory.js
// Normalize inventory entries per hospital to canonical organ and bloodType casing

import { connectDB } from '../src/config/mongodb.js';
import Hospital from '../src/models/Hospital.js';
import Inventory from '../src/models/Inventory.js';

const ORGANS_LIST = ['KIDNEY','LIVER','HEART','LUNG','PANCREAS','CORNEA','BONE MARROW'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

async function normalize() {
  await connectDB();
  const hospitals = await Hospital.find({}).lean();
  console.log('Hospitals found:', hospitals.length);
  for (const h of hospitals) {
    console.log('\nProcessing', h.name, h._id);
    // Organs
    for (const organ of ORGANS_LIST) {
      const regex = new RegExp(`^${organ}$`, 'i');
      const docs = await Inventory.find({ hospitalId: h._id, itemType: 'organ', organType: { $regex: regex } }).lean();
      if (!docs || docs.length === 0) continue;
      // pick the doc with max count (prefer non-zero)
      let best = docs[0];
      for (const d of docs) {
        if ((d.count || 0) > (best.count || 0)) best = d;
      }
      // remove other docs
      const idsToDelete = docs.filter(d => String(d._id) !== String(best._id)).map(d => d._id);
      if (idsToDelete.length) {
        await Inventory.deleteMany({ _id: { $in: idsToDelete } });
        console.log('Removed duplicate organ docs for', organ, idsToDelete.length);
      }
      // update the remaining doc to canonical organType and count as best.count
      await Inventory.findOneAndUpdate({ _id: best._id }, { $set: { organType: organ, count: best.count || 0, bloodType: '' } });
      console.log('Normalized organ', organ, 'count', best.count || 0);
    }

    // Blood
    for (const bg of BLOOD_GROUPS) {
      const regex = new RegExp(`^${bg}$`, 'i');
      const docs = await Inventory.find({ hospitalId: h._id, itemType: 'blood', bloodType: { $regex: regex } }).lean();
      if (!docs || docs.length === 0) continue;
      let best = docs[0];
      for (const d of docs) {
        if ((d.count || 0) > (best.count || 0)) best = d;
      }
      const idsToDelete = docs.filter(d => String(d._id) !== String(best._id)).map(d => d._id);
      if (idsToDelete.length) {
        await Inventory.deleteMany({ _id: { $in: idsToDelete } });
        console.log('Removed duplicate blood docs for', bg, idsToDelete.length);
      }
      await Inventory.findOneAndUpdate({ _id: best._id }, { $set: { bloodType: bg, count: best.count || 0, organType: '' } });
      console.log('Normalized blood', bg, 'count', best.count || 0);
    }
  }
  console.log('\nNormalization complete');
  process.exit(0);
}

normalize().catch(e=>{console.error(e); process.exit(1)})
