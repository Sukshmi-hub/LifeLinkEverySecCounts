// server.js - LifeLink Backend Entry Point
import dotenv from 'dotenv'
import app from './src/app.js'
import { connectDB } from './src/config/mongodb.js'

// Load environment variables
dotenv.config()

// Initialize Razorpay SDK (attach to app.locals for use elsewhere)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let Razorpay
try {
  Razorpay = require('razorpay')
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const razor = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
      app.locals.razorpay = razor
      console.log('Razorpay initialized')
    } catch (e) {
      console.warn('Razorpay SDK present but failed to initialize', e && e.message)
    }
  } else {
    console.warn('Razorpay keys not set in environment; create-order will return 500 until configured')
  }
} catch (e) {
  console.warn('Razorpay SDK not installed. Install `razorpay` package to enable payments')
}

const PORT = process.env.PORT || 5000
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production'

const startServer = async (portToUse) => {
  const server = app.listen(portToUse, () => {
    console.log('🩸 LifeLink Backend Server')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Server running on port ${portToUse}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    console.log(`🔗 API URL: http://localhost:${portToUse}`)
    console.log(`📊 Health Check: http://localhost:${portToUse}/health`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 Backend is ready to save lives!')
  })

  // Initialize Socket.io and pass the running server
  try {
    const { initSocket } = await import('./src/socket.js')
    initSocket(server)
    console.log('🔌 Socket.io initialized')
  } catch (err) {
    console.error('Failed to initialize Socket.io', err)
  }

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (!isProduction) {
        const nextPort = Number(portToUse) + 1
        console.warn(`Port ${portToUse} is busy. Retrying on ${nextPort}...`)
        startServer(nextPort)
        return
      }

      console.error(`❌ Port ${portToUse} is already in use. Please stop the process using this port or set a different PORT in your .env`)
      console.error('Tip: run `netstat -ano | findstr :5000` to find the PID, then `taskkill /PID <pid> /F` on Windows')
      process.exit(1)
      return
    }
    console.error('Server error:', err)
    process.exit(1)
  })

  return server
}

// Ensure DB is connected before starting the server
try {
  await connectDB()

  // Global process handlers to log unhandled errors (avoid silent crashes during dev)
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  })

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err)
    // Do not exit automatically in development, log and attempt to continue.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  })

  await startServer(PORT)
} catch (err) {
  console.error('Failed to start server due to DB connection error:', err.message)
  process.exit(1)
}
