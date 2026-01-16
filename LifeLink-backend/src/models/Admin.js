// src/models/Admin.js - Admin Schema
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    admin_level: {
      type: String,
      enum: ['super_admin', 'regional_admin', 'hospital_admin'],
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      enum: ['manage_users', 'manage_hospitals', 'manage_ngos', 'manage_requests', 'view_analytics', 'system_settings'],
      default: [],
    },
    managed_regions: {
      type: [String],
      default: [],
    },
    managed_hospitals: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Hospital',
      default: [],
    },
    // Store plain password for admin as requested (note: insecure)
    password: {
      type: String,
      required: true,
    },
    activity_logs: {
      type: [
        {
          action: String,
          timestamp: Date,
          details: String,
        },
      ],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
