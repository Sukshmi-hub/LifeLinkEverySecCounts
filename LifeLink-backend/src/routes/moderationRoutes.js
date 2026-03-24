// src/routes/moderationRoutes.js - Admin Moderation Routes
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import {
  reportUser,
  getFlaggedUsers,
  getUserReports,
  changeUserStatus,
  getAllUsersWithReports,
  updateReportStatus,
  getUserActivityLogs,
} from '../controllers/moderationController.js';

const router = express.Router();

/**
 * PUBLIC MODERATION ROUTES
 */

/**
 * @route POST /api/moderation/report-user
 * @desc Report another user (any authenticated user can report)
 * @access Private
 */
router.post('/report-user', authenticate, reportUser);

/**
 * ADMIN MODERATION ROUTES
 */

/**
 * @route GET /api/moderation/flagged-users
 * @desc Get users with report count >= 3
 * @access Private (Admin)
 */
router.get('/flagged-users', authenticate, adminOnly, getFlaggedUsers);

/**
 * @route GET /api/moderation/all-users-with-reports
 * @desc Get all users with their report counts
 * @access Private (Admin)
 */
router.get('/all-users-with-reports', authenticate, adminOnly, getAllUsersWithReports);

/**
 * @route GET /api/moderation/reports/:userId
 * @desc Get all reports for a specific user
 * @access Private (Admin)
 */
router.get('/reports/:userId', authenticate, adminOnly, getUserReports);

/**
 * @route PUT /api/moderation/user/:userId/status
 * @desc Change user status (Active, Suspended, Blocked)
 * @access Private (Admin)
 */
router.put('/user/:userId/status', authenticate, adminOnly, changeUserStatus);

/**
 * @route PUT /api/moderation/reports/:reportId/status
 * @desc Update report status (pending, under_review, resolved, dismissed)
 * @access Private (Admin)
 */
router.put('/reports/:reportId/status', authenticate, adminOnly, updateReportStatus);

/**
 * @route GET /api/moderation/activity-logs/:userId
 * @desc Get activity logs for a user
 * @access Private (Admin)
 */
router.get('/activity-logs/:userId', authenticate, adminOnly, getUserActivityLogs);

export default router;
