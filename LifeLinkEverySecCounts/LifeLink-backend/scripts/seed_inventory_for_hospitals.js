#!/usr/bin/env node
// scripts/seed_inventory_for_hospitals.js
// Usage: node scripts/seed_inventory_for_hospitals.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/mongodb.js';
import Hospital from '../src/models/Hospital.js';
import Inventory from '../src/models/Inventory.js';

dotenv.config();

const ORGANS_LIST = ['KIDNEY','LIVER','HEART','LUNG','PANCREAS','CORNEA','BONE MARROW'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

async function seed() {
  await connectDB();
  try {
    const hospitals = await Hospital.find({}).lean();
    console.log('Found', hospitals.length, 'hospitals');
    for (const hosp of hospitals) {
      const hid = hosp._id;
      // check existing inventory count for this hospital
      const existing = await Inventory.find({ hospitalId: hid }).lean();
      const existingKeys = new Set(existing.map(e => `${e.itemType}|${(e.organType||'')}|${(e.bloodType||'')}`));

      // seed organs
      for (const organ of ORGANS_LIST) {
        const key = `organ|${organ}|`;
        if (!existingKeys.has(key)) {
          try {
            await Inventory.create({ hospitalId: hid, itemType: 'organ', organType: organ, bloodType: '', count: 0 });
            console.log(`Seeded organ ${organ} for hospital ${hid}`);
          } catch (e) {
            console.error('Failed to seed organ', organ, 'for hospital', hid, e.message);
          }
        }
      }

      // seed blood groups
      for (const bg of BLOOD_GROUPS) {
        const key = `blood||${bg}`;
        if (!existingKeys.has(key)) {
          try {
            await Inventory.create({ hospitalId: hid, itemType: 'blood', organType: '', bloodType: bg, count: 0 });
            console.log(`Seeded blood ${bg} for hospital ${hid}`);
          } catch (e) {
            console.error('Failed to seed blood', bg, 'for hospital', hid, e.message);
          }
        }
      }
    }
    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error', err);
    process.exit(1);
  }
}

seed();
