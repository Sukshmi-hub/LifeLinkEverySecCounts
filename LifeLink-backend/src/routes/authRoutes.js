// src/routes/authRoutes.js - Authentication Routes
import express from 'express'
import {
  sendSignupOtp,
  verifySignupOtp,
  signup,
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/send-signup-otp', sendSignupOtp)
router.post('/verify-signup-otp', verifySignupOtp)

/**
 * @route   POST /api/auth/signup
 * @desc    Signup new user and send email verification OTP
 * @access  Public
 */
router.post('/signup', signup)

/**
 * @route   POST /api/auth/register
 * @desc    Legacy signup alias
 * @access  Public
 */
router.post('/register', register)

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post('/verify-email', verifyEmail)

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification OTP
 * @access  Public
 */
router.post('/resend-verification', resendVerification)

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

export default router