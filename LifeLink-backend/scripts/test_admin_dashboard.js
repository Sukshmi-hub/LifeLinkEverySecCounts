import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

dotenv.config();

const baseURL = 'http://localhost:5000';

const testAdminDashboard = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('✅ Connected to MongoDB\n');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin12@';

    // Step 1: Login to get token
    console.log('🔐 Logging in as admin...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    const { token } = loginResponse.data.data;
    console.log('✅ Login successful!');

    // Step 2: Fetch dashboard data
    console.log('\n📊 Fetching Dashboard Data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const dashboardResponse = await axios.get(`${baseURL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = dashboardResponse.data.data;
    
    console.log('✅ Dashboard data fetched successfully!');
    console.log('\n📈 Dashboard Statistics:');
    console.log(`   Total Users: ${data.totalUsers}`);
    console.log(`   System Health: ${data.systemHealth}%`);
    
    console.log('\n👥 User Distribution:');
    console.log(`   Patients: ${data.userDistribution.patients} (${data.userPercentages.patients}%)`);
    console.log(`   Donors: ${data.userDistribution.donors} (${data.userPercentages.donors}%)`);
    console.log(`   Hospitals: ${data.userDistribution.hospitals} (${data.userPercentages.hospitals}%)`);
    console.log(`   NGOs: ${data.userDistribution.ngos} (${data.userPercentages.ngos}%)`);
    
    console.log('\n📋 Recent Activities:');
    data.recentActivities.forEach((activity, index) => {
      const date = new Date(activity.timestamp);
      console.log(`   ${index + 1}. ${activity.message}`);
      console.log(`      Type: ${activity.type} | Time: ${date.toLocaleString()}`);
    });

    console.log('\n✅ Admin Dashboard API Test PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testAdminDashboard();
