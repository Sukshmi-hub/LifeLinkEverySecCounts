// src/models/Report.js - Report Schema for user moderation
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reported_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID to report'],
    },
    reported_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide reporter user ID'],
    },
    reason: {
      type: String,
      required: [true, 'Please provide reason for report'],
      minlength: [10, 'Reason must be at least 10 characters long'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending',
    },
    admin_notes: {
      type: String,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters'],
    },
    evidence: [
      {
        type: String, // Can be URLs or file paths
      }
    ],
  },
  { timestamps: true }
);

// Index for faster queries
reportSchema.index({ reported_user_id: 1 });
reportSchema.index({ reported_by_user_id: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1 });

export default mongoose.model('Report', reportSchema);
