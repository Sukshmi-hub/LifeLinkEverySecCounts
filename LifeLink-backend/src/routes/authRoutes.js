// src/routes/authRoutes.js - Authentication Routes
import express from 'express'
import { register, login, getMe, logout, forgotPassword, resetPassword, sendOTP, verifyOTP } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', register)

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login)

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/me', authenticate, getMe)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
router.post('/forgot-password', forgotPassword)

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPassword)

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number via SMS
 * @access  Public
 */
router.post('/send-otp', sendOTP)

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp', verifyOTP)

export default router