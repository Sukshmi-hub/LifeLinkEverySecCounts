// src/app.js - Express Application Setup
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes (we'll create these next)
import authRoutes from './routes/authRoutes.js'
import donorRoutes from './routes/donorRoutes.js'
import hospitalRoutes from './routes/hospitalRoutes.js'
import requestRoutes from './routes/requestRoutes.js'

dotenv.config()

const app = express()

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow frontend to access backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

// Body parser - Parse JSON requests
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'LifeLink Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/donors', donorRoutes)
app.use('/api/hospitals', hospitalRoutes)
app.use('/api/requests', requestRoutes)

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🩸 Welcome to LifeLink API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      donors: '/api/donors',
      hospitals: '/api/hospitals',
      requests: '/api/requests'
    }
  })
})

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  })
})

export default app