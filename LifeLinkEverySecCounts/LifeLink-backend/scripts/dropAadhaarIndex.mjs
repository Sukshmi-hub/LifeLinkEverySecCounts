import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/LifeLinkdb';

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB:', uri);
    const coll = mongoose.connection.collection('users');
    const indexes = await coll.indexes();
    console.log('Existing indexes:', indexes.map(i => i.name));

    const targetNames = [
      'aadhaar_no_1',
      'aadhaar_no',
    ];

    const toDrop = indexes.find(i => targetNames.includes(i.name) || (i.key && i.key.aadhaar_no));
    if (!toDrop) {
      console.log('No aadhaar index found to drop.');
    } else {
      const name = toDrop.name;
      console.log('Dropping index:', name);
      await coll.dropIndex(name);
      console.log('Dropped index:', name);
    }
  } catch (err) {
    console.error('Error dropping index:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
