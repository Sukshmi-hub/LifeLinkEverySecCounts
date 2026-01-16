// src/app.js - Express Application Setup
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './config/mongodb.js'

// Import routes
import authRoutes from './routes/authRoutes.js'
import donorRoutes from './routes/donorRoutes.js'
import hospitalRoutes from './routes/hospitalRoutes.js'
import requestRoutes from './routes/requestRoutes.js'
import debugRoutes from './routes/debugRoutes.js'
import { dbCheck } from './middleware/dbCheck.js'
import mongoose from './config/mongodb.js'

dotenv.config()

const app = express()

// Note: DB connection is established in server.js before starting the server

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow frontend to access backend
const devOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: devOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      // In development reflect the request origin (allows any local dev origin)
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

app.use(cors(corsOptions));
// Ensure preflight requests are handled for all routes
app.options('*', cors(corsOptions));

// Body parser - Parse JSON requests
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Handle JSON body parse errors gracefully
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('Body parse error:', err.message)
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' })
  }
  next(err)
})

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
  const ready = mongoose.connection.readyState === 1;
  res.json({
    status: ready ? 'OK' : 'DB_DISCONNECTED',
    message: ready ? 'LifeLink Backend is running!' : 'Database not connected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    db_ready: ready
  })
})

// API Routes
// Ensure DB is available for API routes
app.use('/api', dbCheck)
app.use('/api/auth', authRoutes)
app.use('/api/donors', donorRoutes)
app.use('/api/hospitals', hospitalRoutes)
app.use('/api/requests', requestRoutes)

// Debug routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes)
}

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