// src/models/ActivityLog.js - Activity Log Schema for tracking user actions
import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID'],
    },
    action: {
      type: String,
      required: [true, 'Please provide action'],
      enum: [
        'login',
        'logout',
        'register',
        'profile_update',
        'donation_request',
        'report_filed',
        'message_sent',
        'status_suspended',
        'status_blocked',
        'status_activated',
        'other'
      ],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Store additional context
    },
  },
  { timestamps: true }
);

// Index for faster queries
activityLogSchema.index({ user_id: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);
