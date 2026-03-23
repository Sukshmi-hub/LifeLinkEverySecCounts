import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Admin from '../src/models/Admin.js';

dotenv.config();

const main = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('Connected to MongoDB');

    // Admin credentials
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin12@';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin with this email already exists!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create User for admin (if not exists)
    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      user = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        phone: '+919999999999',
        role: 'admin',
        is_verified: true,
      });
      console.log('New User created:', user._id);
    } else {
      console.log('User already exists:', user._id);
    }

    // Create Admin record
    const admin = await Admin.create({
      userId: user._id,
      email: adminEmail,
      password: adminPassword,
      admin_level: 'super_admin',
      department: 'System Administration',
      permissions: [
        'manage_users',
        'manage_hospitals',
        'manage_ngos',
        'manage_requests',
        'view_analytics',
        'system_settings',
      ],
      managed_regions: [],
      managed_hospitals: [],
      is_active: true,
    });

    console.log('Admin created successfully!');
    console.log('Admin ID:', admin._id);
    console.log('Email:', admin.email);
    console.log('Admin Level:', admin.admin_level);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();
