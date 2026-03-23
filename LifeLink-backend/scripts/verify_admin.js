import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../src/models/Admin.js';

dotenv.config();

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('Connected to MongoDB');

    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    if (admin) {
      console.log('\n✅ Admin Record Successfully Created!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email: ${admin.email}`);
      console.log(`Password: ${admin.password}`);
      console.log(`Admin Level: ${admin.admin_level}`);
      console.log(`Department: ${admin.department}`);
      console.log(`Is Active: ${admin.is_active}`);
      console.log(`Permissions: ${admin.permissions.join(', ')}`);
      console.log(`Created At: ${admin.createdAt}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('❌ Admin not found');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

verify();
