// Script to drop the unique index on medical_id in the patients collection
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/LifeLinkdb';

async function dropMedicalIdIndex() {
  await mongoose.connect(MONGO_URI);
  const result = await mongoose.connection.db.collection('patients').dropIndex('medical_id_1').catch(e => e);
  console.log('Drop index result:', result);
  await mongoose.disconnect();
}

dropMedicalIdIndex();
