// src/config/mongodb.js - MongoDB Connection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
};

export const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MongoDB connection string is not set. Add MONGO_URI in the environment.');
    }

    const conn = await mongoose.connect(MONGO_URI, connectionOptions);

    console.log('✅ MongoDB Connected Successfully');
    console.log(`📦 Database: ${conn.connection.name}`);
    console.log(`🌍 Host: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

export default mongoose;
