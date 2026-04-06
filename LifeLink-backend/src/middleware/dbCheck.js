import mongoose from '../config/mongodb.js'

export const dbCheck = (req, res, next) => {
  const originalUrl = String(req.originalUrl || '')

  // Allow the health chat route to run even when Mongo is down.
  // The chat endpoint can fall back to stateless replies, while other APIs still require DB.
  if (originalUrl.startsWith('/api/health-chat')) {
    return next()
  }

  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  if (state === 1) return next();

  console.error('DB not ready for request:', { path: req.path, method: req.method, state });
  return res.status(503).json({ success: false, message: 'Database not connected', db_ready: false, state });
}

export default dbCheck;
