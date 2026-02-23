#!/usr/bin/env node
import { connectDB } from '../src/config/mongodb.js';
import Hospital from '../src/models/Hospital.js';
import Inventory from '../src/models/Inventory.js';

async function run() {
  await connectDB();
  const hospitals = await Hospital.find({}).lean();
  for (const h of hospitals) {
    const items = await Inventory.find({ hospitalId: h._id }).lean();
    const organs = items.filter(i => i.itemType === 'organ').map(i => ({ organType: i.organType, count: i.count }));
    const blood = items.filter(i => i.itemType === 'blood').map(i => ({ bloodType: i.bloodType, count: i.count }));
    console.log(`Hospital: ${h.name} (${h._id})`);
    console.log('Organs:', organs.length ? organs.map(o=>`${o.organType}:${o.count}`).join(', ') : 'none');
    console.log('Blood:', blood.length ? blood.map(b=>`${b.bloodType}:${b.count}`).join(', ') : 'none');
    console.log('-----');
  }
  process.exit(0);
}

run().catch(e=>{console.error(e); process.exit(1)})
