import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Admin from '../src/models/Admin.js';

dotenv.config();

const setupAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('📦 Connected to MongoDB');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin12@';

    // Delete existing admin records (fresh start)
    await User.deleteOne({ email: adminEmail });
    await Admin.deleteOne({ email: adminEmail });
    console.log('🗑️  Cleared existing admin records');

    // Create User with proper role
    const user = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword, // This will be hashed by pre-save hook
      phone: '+919999999999',
      role: 'admin',
      is_verified: true,
    });

    console.log('✅ User created with ID:', user._id);
    console.log('   - Email: ' + user.email);
    console.log('   - Role: ' + user.role);
    console.log('   - Password hashed: Yes');

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

    console.log('✅ Admin record created with ID:', admin._id);
    console.log('   - Email: ' + admin.email);
    console.log('   - Admin Level: ' + admin.admin_level);

    // Verify login
    console.log('\n🔐 Testing login credentials...');
    const testUser = await User.findOne({ email: adminEmail }).select('+password');
    if (testUser) {
      const isMatch = await testUser.matchPassword(adminPassword);
      if (isMatch) {
        console.log('✅ Password verification: SUCCESS');
        console.log('\n📋 Admin Setup Complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Login Email: ${adminEmail}`);
        console.log(`Login Password: ${adminPassword}`);
        console.log(`Role: admin`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.log('❌ Password verification: FAILED');
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

setupAdmin();
