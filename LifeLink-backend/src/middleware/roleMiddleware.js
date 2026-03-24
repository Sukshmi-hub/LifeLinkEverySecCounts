// src/middleware/roleMiddleware.js
export const patientOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Access denied: patients only' })
  }
  next()
}

export const donorOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ success: false, message: 'Access denied: donors only' })
  }
  next()
}

export const hospitalOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'hospital') {
    return res.status(403).json({ success: false, message: 'Access denied: hospitals only' })
  }
  next()
}

export const ngoOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'ngo') {
    return res.status(403).json({ success: false, message: 'Access denied: ngos only' })
  }
  next()
}

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: admin only' })
  }
  next()
}

export default { patientOnly, donorOnly, hospitalOnly, ngoOnly, adminOnly }
