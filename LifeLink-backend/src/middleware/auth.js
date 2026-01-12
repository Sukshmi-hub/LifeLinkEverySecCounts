// src/middleware/auth.js - Authentication Middleware
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

/**
 * Verify JWT token and authenticate user
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      })
    }

    // Attach user to request object
    req.user = user
    next()

  } catch (error) {
    console.error('Authentication error:', error.message)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

/**
 * Check if user has required role
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      })
    }

    next()
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', decoded.userId)
      .single()

    if (user) {
      req.user = user
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}

export default { authenticate, requireRole, optionalAuth }