import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

dotenv.config();

const baseURL = 'http://localhost:5000';

const testAdminLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin12@';

    // Step 1: Test login endpoint
    console.log('🔐 Testing Admin Login...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      await mongoose.connection.close();
      process.exit(1);
    }

    const { token, user } = loginResponse.data.data;
    console.log('✅ Login successful!');
    console.log(`   User: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 2: Test profile endpoint with token
    console.log('\n📋 Testing Profile Endpoint...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const profileResponse = await axios.get(`${baseURL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!profileResponse.data.success) {
      console.log('❌ Profile fetch failed:', profileResponse.data.message);
      await mongoose.connection.close();
      process.exit(1);
    }

    const profile = profileResponse.data.data.user;
    console.log('✅ Profile fetched successfully!');
    console.log(`   Full Name: ${profile.fullName}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Admin Level: ${profile.admin_level || 'N/A'}`);
    console.log(`   Department: ${profile.department || 'N/A'}`);
    console.log(`   Active: ${profile.is_active !== undefined ? profile.is_active : 'N/A'}`);

    console.log('\n✅ Admin Login Flow Test PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('The admin should now be able to login and access the admin dashboard.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAdminLogin();
