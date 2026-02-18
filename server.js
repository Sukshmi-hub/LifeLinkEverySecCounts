// server.js - LifeLink Backend Entry Point
import dotenv from 'dotenv'
import app from './src/app.js'
import { connectDB } from './src/config/mongodb.js'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 5000

// Ensure DB is connected before starting the server
try {
  await connectDB()
  const server = app.listen(PORT, () => {
    console.log('🩸 LifeLink Backend Server')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    console.log(`🔗 API URL: http://localhost:${PORT}`)
    console.log(`📊 Health Check: http://localhost:${PORT}/health`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 Backend is ready to save lives!')
  })
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please stop the process using this port or set a different PORT in your .env`)
      console.error('Tip: run `netstat -ano | findstr :5000` to find the PID, then `taskkill /PID <pid> /F` on Windows')
      process.exit(1)
    }
    console.error('Server error:', err)
    process.exit(1)
  })

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
} catch (err) {
  console.error('Failed to start server due to DB connection error:', err.message)
  process.exit(1)
}