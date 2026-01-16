import mongoose from '../config/mongodb.js'

export const dbCheck = (req, res, next) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  if (state === 1) return next();

  console.error('DB not ready for request:', { path: req.path, method: req.method, state });
  return res.status(503).json({ success: false, message: 'Database not connected', db_ready: false, state });
}

export default dbCheck;
