import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getAdminDashboardData, getAllUsers, getAdminRequests } from '../controllers/adminController.js'

const router = express.Router()

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data (users, activities, system health)
 * @access  Private (admin only)
 */
router.get('/dashboard', authenticate, getAdminDashboardData)

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with optional filtering by role or search
 * @access  Private (admin only)
 */
router.get('/users', authenticate, getAllUsers)

/**
 * @route   GET /api/admin/requests
 * @desc    Get recent requests for admin (read-only)
 * @access  Private (admin only)
 */
router.get('/requests', authenticate, requireRole('admin'), getAdminRequests)

export default router
