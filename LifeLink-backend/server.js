// server.js - LifeLink Backend Entry Point
import dotenv from 'dotenv'
import app from './src/app.js'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 5000

// Start server
app.listen(PORT, () => {
  console.log('🩸 LifeLink Backend Server')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔗 API URL: http://localhost:${PORT}`)
  console.log(`📊 Health Check: http://localhost:${PORT}/health`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 Backend is ready to save lives!')
})