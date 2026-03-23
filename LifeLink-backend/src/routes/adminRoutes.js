import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { getAdminDashboardData } from '../controllers/adminController.js'

const router = express.Router()

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data (users, activities, system health)
 * @access  Private (admin only)
 */
router.get('/dashboard', authenticate, getAdminDashboardData)

export default router
