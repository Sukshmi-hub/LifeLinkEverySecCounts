// Script to drop the unique index on registration_number in hospital and ngo collections
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/LifeLinkdb';

async function dropRegistrationNumberIndexes() {
  await mongoose.connect(MONGO_URI);
  try {
    const hospitalResult = await mongoose.connection.db.collection('hospitals').dropIndex('registration_number_1');
    console.log('Hospital registration_number index dropped:', hospitalResult);
  } catch (e) {
    console.log('Hospital registration_number index not found or already dropped.');
  }
  try {
    const ngoResult = await mongoose.connection.db.collection('ngos').dropIndex('registration_number_1');
    console.log('NGO registration_number index dropped:', ngoResult);
  } catch (e) {
    console.log('NGO registration_number index not found or already dropped.');
  }
  await mongoose.disconnect();
}

dropRegistrationNumberIndexes();
