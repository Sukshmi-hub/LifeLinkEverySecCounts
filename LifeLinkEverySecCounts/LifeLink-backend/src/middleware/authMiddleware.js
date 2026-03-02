// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('+role')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    req.user = { id: user._id, role: user.role }
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    return res.status(500).json({ success: false, message: 'Authentication failed' })
  }
}

export default authMiddleware
