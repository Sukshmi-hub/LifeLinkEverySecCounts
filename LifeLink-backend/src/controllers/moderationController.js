// src/controllers/moderationController.js - Admin Moderation Functions
import Report from '../models/Report.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import Patient from '../models/Patient.js';
import Donor from '../models/Donor.js';

/**
 * @route POST /api/moderation/report-user
 * @desc Report another user (available to all authenticated users)
 * @access Private
 * 
 * Accepts either:
 * 1. reported_user_id (direct user ID)
 * 2. patient_id + user_type: 'patient' (will look up patient and get userId)
 * 3. donor_id + user_type: 'donor' (will look up donor and get userId)
 */
export const reportUser = async (req, res) => {
  try {
    const { reported_user_id, reason, description, evidence, patient_id, donor_id, user_type } = req.body;
    const reporting_user_id = req.user._id;

    let finalUserId = reported_user_id;

    // If patient_id or donor_id provided, resolve to user_id
    if (!finalUserId) {
      if (patient_id && user_type === 'patient') {
        try {
          // Handle case where patient_id might be an object (with _id or userId)
          const patientIdToUse = typeof patient_id === 'object' && patient_id._id ? patient_id._id : patient_id;
          const patient = await Patient.findById(patientIdToUse);
          if (patient && patient.userId) {
            finalUserId = patient.userId;
          } else if (typeof patient_id === 'object' && patient_id.userId) {
            // If patient_id is already a populated object with userId, use it directly
            finalUserId = patient_id.userId;
          }
        } catch (err) {
          console.error('Error looking up patient:', err);
        }
      } else if (donor_id && user_type === 'donor') {
        try {
          // Handle case where donor_id might be an object (with _id or userId)
          const donorIdToUse = typeof donor_id === 'object' && donor_id._id ? donor_id._id : donor_id;
          const donor = await Donor.findById(donorIdToUse);
          if (donor && donor.userId) {
            finalUserId = donor.userId;
          } else if (typeof donor_id === 'object' && donor_id.userId) {
            // If donor_id is already a populated object with userId, use it directly
            finalUserId = donor_id.userId;
          }
        } catch (err) {
          console.error('Error looking up donor:', err);
        }
      }
    }

    // Validation
    if (!finalUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID to report and a reason',
      });
    }

    // Prevent self-reporting
    if (reporting_user_id.toString() === finalUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself',
      });
    }

    // Check if reported user exists
    const reportedUser = await User.findById(finalUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check for duplicate reports from same user in last 24 hours
    const recentReport = await Report.findOne({
      reported_user_id: finalUserId,
      reported_by_user_id: reporting_user_id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this user in the last 24 hours',
      });
    }

    // Create report
    const newReport = new Report({
      reported_user_id: finalUserId,
      reported_by_user_id: reporting_user_id,
      reason,
      description,
      evidence: evidence || [],
    });

    await newReport.save();

    // Log activity
    await logActivity(
      reporting_user_id,
      'report_filed',
      `Reported user ${reportedUser.name}`
    );

    // Update reported user's reportCount and apply auto-suspend/block rules
    try {
      // Recalculate count to be canonical
      const ReportModel = Report;
      const cnt = await ReportModel.countDocuments({ reported_user_id: finalUserId });
      reportedUser.reportCount = cnt;

      // Auto-block if 3 or more reports
      if (reportedUser.reportCount >= 3) {
        reportedUser.status = 'blocked';
        reportedUser.suspendedUntil = null;
      } else if (reportedUser.reportCount === 2) {
        // Auto-suspend for 48 hours
        reportedUser.status = 'suspended';
        reportedUser.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
      }

      await reportedUser.save();

      // Mirror moderation fields to role-specific document if present
      try {
        if (reportedUser.role === 'patient') {
          const p = await Patient.findOne({ userId: reportedUser._id });
          if (p) {
            p.reportCount = reportedUser.reportCount || 0;
            p.status = reportedUser.status || p.status;
            p.suspendedUntil = reportedUser.suspendedUntil || p.suspendedUntil;
            await p.save();
          }
        } else if (reportedUser.role === 'donor') {
          const d = await Donor.findOne({ userId: reportedUser._id });
          if (d) {
            d.reportCount = reportedUser.reportCount || 0;
            d.status = reportedUser.status || d.status;
            d.suspendedUntil = reportedUser.suspendedUntil || d.suspendedUntil;
            await d.save();
          }
        }
        // Hospitals and NGOs may be handled elsewhere; attempt best-effort updates
        const HospitalModel = (await import('../models/Hospital.js')).default;
        const NGOModel = (await import('../models/NGO.js')).default;
        try {
          const h = await HospitalModel.findOne({ userId: reportedUser._id });
          if (h) {
            h.reportCount = reportedUser.reportCount || 0;
            h.status = reportedUser.status || h.status;
            h.suspendedUntil = reportedUser.suspendedUntil || h.suspendedUntil;
            await h.save();
          }
        } catch (e) {}
        try {
          const n = await NGOModel.findOne({ userId: reportedUser._id });
          if (n) {
            n.reportCount = reportedUser.reportCount || 0;
            n.status = reportedUser.status || n.status;
            n.suspendedUntil = reportedUser.suspendedUntil || n.suspendedUntil;
            await n.save();
          }
        } catch (e) {}
      } catch (e) {
        // non-critical
      }
    } catch (e) {
      console.error('Failed to update reported user moderation fields:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: newReport,
    });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message,
    });
  }
};

/**
 * @route GET /api/moderation/flagged-users
 * @desc Get users with report count >= 3 (admin only)
 * @access Private (Admin)
 */
export const getFlaggedUsers = async (req, res) => {
  try {
    const { limit = 10, skip = 0, sortBy = 'reportCount' } = req.query;

    // Aggregate users with their report count
    const flaggedUsers = await User.aggregate([
      {
        $lookup: {
          from: 'reports',
          localField: '_id',
          foreignField: 'reported_user_id',
          as: 'reports',
        },
      },
      {
        $addFields: {
          reportCount: { $size: '$reports' },
        },
      },
      {
        $match: {
          reportCount: { $gte: 3 }, // Only show users with 3+ reports
        },
      },
      {
        $sort: sortBy === 'reportCount' ? { reportCount: -1 } : { createdAt: -1 },
      },
      {
        $skip: parseInt(skip),
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          reportCount: 1,
          createdAt: 1,
          reports: {
            $slice: ['$reports', 5], // Get last 5 reports
          },
        },
      },
    ]);

    // Get total count of flagged users
    const totalFlagged = await User.aggregate([
      {
        $lookup: {
          from: 'reports',
          localField: '_id',
          foreignField: 'reported_user_id',
          as: 'reports',
        },
      },
      {
        $addFields: {
          reportCount: { $size: '$reports' },
        },
      },
      {
        $match: {
          reportCount: { $gte: 3 },
        },
      },
      {
        $count: 'total',
      },
    ]);

    const total = totalFlagged.length > 0 ? totalFlagged[0].total : 0;

    res.status(200).json({
      success: true,
      message: 'Flagged users retrieved successfully',
      data: flaggedUsers,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching flagged users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flagged users',
      error: error.message,
    });
  }
};

/**
 * @route GET /api/moderation/reports/:userId
 * @desc Get all reports for a specific user (admin only)
 * @access Private (Admin)
 */
export const getUserReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get reports with reporter details
    const reports = await Report.find({ reported_user_id: userId })
      .populate('reported_by_user_id', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalReports = await Report.countDocuments({
      reported_user_id: userId,
    });

    res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        reports,
        totalCount: totalReports,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(totalReports / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports',
      error: error.message,
    });
  }
};

/**
 * @route PUT /api/moderation/user/:userId/status
 * @desc Change user status (Suspend, Block, Activate) - Admin only
 * @access Private (Admin)
 */
export const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Normalize status to lowercase for validation (accept case-insensitive input)
    const normalizedStatus = String(status || '').toLowerCase();
    if (!normalizedStatus || !['active', 'suspended', 'blocked'].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, suspended, or blocked',
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from changing own status
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status',
      });
    }

    const oldStatus = user.status;
    user.status = normalizedStatus;
    // If suspending, set suspendedUntil for 48 hours
    if (normalizedStatus === 'suspended') {
      user.suspendedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else {
      user.suspendedUntil = null;
    }
    await user.save();

    // Mirror to role-specific doc (best-effort)
    try {
      if (user.role === 'patient') {
        const p = await Patient.findOne({ userId: user._id });
        if (p) {
          p.status = user.status || p.status;
          p.suspendedUntil = user.suspendedUntil || p.suspendedUntil;
          await p.save();
        }
      } else if (user.role === 'donor') {
        const d = await Donor.findOne({ userId: user._id });
        if (d) {
          d.status = user.status || d.status;
          d.suspendedUntil = user.suspendedUntil || d.suspendedUntil;
          await d.save();
        }
      }
      const HospitalModel = (await import('../models/Hospital.js')).default;
      const NGOModel = (await import('../models/NGO.js')).default;
      try {
        const h = await HospitalModel.findOne({ userId: user._id });
        if (h) {
          h.status = user.status || h.status;
          h.suspendedUntil = user.suspendedUntil || h.suspendedUntil;
          await h.save();
        }
      } catch (e) {}
      try {
        const n = await NGOModel.findOne({ userId: user._id });
        if (n) {
          n.status = user.status || n.status;
          n.suspendedUntil = user.suspendedUntil || n.suspendedUntil;
          await n.save();
        }
      } catch (e) {}
    } catch (e) {
      // ignore
    }

    // Log activity for both admin and user
    await logActivity(
      req.user._id,
      'status_' + status,
      `Admin changed ${user.name}'s status from ${oldStatus} to ${status}. Reason: ${reason || 'No reason provided'}`
    );

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        oldStatus,
        newStatus: user.status,
      },
    });
  } catch (error) {
    console.error('Error changing user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing user status',
      error: error.message,
    });
  }
};

/**
 * @route GET /api/moderation/all-users-with-reports
 * @desc Get all users with their report counts (admin only)
 * @access Private (Admin)
 */
export const getAllUsersWithReports = async (req, res) => {
  try {
    const {
      limit = 20,
      skip = 0,
      sortBy = 'reportCount',
      role = null,
      status = null,
    } = req.query;

    let matchStage = {};
    if (role) matchStage.role = role;
    if (status) matchStage.status = status;

    const users = await User.aggregate([
      {
        $lookup: {
          from: 'reports',
          localField: '_id',
          foreignField: 'reported_user_id',
          as: 'reports',
        },
      },
      {
        $addFields: {
          reportCount: { $size: '$reports' },
          isFlagged: { $gte: [{ $size: '$reports' }, 3] },
        },
      },
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $sort:
          sortBy === 'reportCount'
            ? { reportCount: -1, createdAt: -1 }
            : sortBy === 'name'
              ? { name: 1 }
              : { createdAt: -1 },
      },
      {
        $skip: parseInt(skip),
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          reportCount: 1,
          isFlagged: 1,
          createdAt: 1,
        },
      },
    ]);

    // Get total count
    let countPipeline = [
      {
        $lookup: {
          from: 'reports',
          localField: '_id',
          foreignField: 'reported_user_id',
          as: 'reports',
        },
      },
      {
        $addFields: {
          reportCount: { $size: '$reports' },
        },
      },
    ];

    if (Object.keys(matchStage).length > 0) {
      countPipeline.push({ $match: matchStage });
    }

    countPipeline.push({ $count: 'total' });

    const totalResult = await User.aggregate(countPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
      success: true,
      message: 'Users with reports retrieved successfully',
      data: users,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users with reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * @route PUT /api/moderation/reports/:reportId/status
 * @desc Update report status (admin only)
 * @access Private (Admin)
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !['pending', 'under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        admin_notes,
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report status updated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report status',
      error: error.message,
    });
  }
};

/**
 * Internal helper function to log activity
 * @private
 */
export const logActivity = async (userId, action, description = '') => {
  try {
    const activityLog = new ActivityLog({
      user_id: userId,
      action,
      description,
    });
    await activityLog.save();
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not block the main operation
  }
};

/**
 * @route GET /api/moderation/activity-logs/:userId
 * @desc Get activity logs for a user (admin only)
 * @access Private (Admin)
 */
export const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const logs = await ActivityLog.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments({ user_id: userId });

    res.status(200).json({
      success: true,
      message: 'Activity logs retrieved successfully',
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message,
    });
  }
};
