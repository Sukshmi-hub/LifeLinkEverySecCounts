// src/socket.js - Socket.io server integration and handlers
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import User from './models/User.js'
import Message from './models/Message.js'
import Patient from './models/Patient.js'
import Donor from './models/Donor.js'
import Hospital from './models/Hospital.js'
import NGO from './models/NGO.js'

// Simple in-memory rate limiter per user (reset every 10 seconds)
const rateMap = new Map()

const incrementRate = (userId) => {
  const now = Date.now()
  const entry = rateMap.get(userId) || { count: 0, ts: now }
  if (now - entry.ts > 10000) {
    entry.count = 1
    entry.ts = now
  } else {
    entry.count += 1
  }
  rateMap.set(userId, entry)
  return entry.count
}

export function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
    // only allow on https/localhost in production checks are enforced externally
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      if (!token) return next(new Error('Auth token missing'))
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select('+role')
      if (!user) return next(new Error('Invalid token'))
      socket.user = { id: String(user._id), role: user.role }
      return next()
    } catch (err) {
      return next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user || {}
    console.log('socket connected', userId, role)

    socket.on('join_room', async ({ roomId }, cb) => {
      try {
        // Validate room access
        if (!roomId) return cb && cb({ success: false, message: 'roomId required' })
        if (!(await canAccessRoom(userId, role, roomId))) {
          return cb && cb({ success: false, message: 'Unauthorized to join room' })
        }
        socket.join(roomId)
        cb && cb({ success: true, roomId })
        socket.to(roomId).emit('room_joined', { roomId, userId })
      } catch (err) {
        console.error('join_room error', err)
        cb && cb({ success: false, message: 'Internal server error' })
      }
    })

    socket.on('leave_room', ({ roomId }) => {
      if (roomId) socket.leave(roomId)
    })

    socket.on('typing_start', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', { roomId, userId })
    })
    socket.on('typing_stop', ({ roomId }) => {
      socket.to(roomId).emit('user_stop_typing', { roomId, userId })
    })

    socket.on('send_message', async ({ roomId, content }, cb) => {
      try {
        if (!roomId || !content || typeof content !== 'string' || content.trim().length === 0) return cb && cb({ success: false, message: 'Invalid payload' })
        if (content.length > 2000) return cb && cb({ success: false, message: 'Message too long' })

        // Rate limit
        const count = incrementRate(userId)
        if (count > 10) return cb && cb({ success: false, message: 'Rate limit exceeded' })

        // validate access
        if (!(await canAccessRoom(userId, role, roomId))) return cb && cb({ success: false, message: 'Unauthorized to send message' })

        const msg = new Message({ senderId: userId, senderRole: role, roomId, content, timestamp: new Date() })
        await msg.save()

        io.to(roomId).emit('receive_message', { message: msg })
        cb && cb({ success: true, data: msg })
      } catch (err) {
        console.error('send_message error', err)
        cb && cb({ success: false, message: 'Internal server error' })
      }
    })

    socket.on('mark_read', async ({ roomId, messageIds }, cb) => {
      try {
        if (!roomId || !Array.isArray(messageIds)) return cb && cb({ success: false, message: 'Invalid payload' })
        // Ensure user is part of room
        if (!(await canAccessRoom(userId, role, roomId))) return cb && cb({ success: false, message: 'Unauthorized' })

        await Message.updateMany({ _id: { $in: messageIds }, roomId }, { $set: { isRead: true } })
        io.to(roomId).emit('messages_read', { roomId, messageIds, userId })
        cb && cb({ success: true })
      } catch (err) {
        console.error('mark_read error', err)
        cb && cb({ success: false, message: 'Internal server error' })
      }
    })

    socket.on('disconnect', () => {
      console.log('socket disconnect', userId)
      // Broadcast offline presence to rooms if desired
      // Could iterate socket.rooms but keeping simple
      socket.broadcast.emit('user_offline', { userId })
    })
  })

  // expose io for other modules (safe for dev/local use)
  try {
    global.__LIFELINK_IO = io
  } catch (e) {
    // ignore
  }

  return io
}

// Basic room access validator: parse naming conventions and check relationships
async function canAccessRoom(userId, role, roomId) {
  try {
    if (!roomId) return false
    const r = String(role || '').toLowerCase()
    // room_hospital_{hospitalId}_patient_{patientId}
    if (roomId.startsWith('room_hospital_')) {
      // check patterns
      const parts = roomId.split('_')
      // possible shapes: room_hospital_{hospitalId}_patient_{patientId}
      const hospIndex = parts.indexOf('hospital')
      const patientIndex = parts.indexOf('patient')
      const donorIndex = parts.indexOf('donor')
      if (patientIndex !== -1 && hospIndex !== -1) {
        const hospitalId = parts[hospIndex + 1]
        const patientId = parts[patientIndex + 1]
        // patient should be admitted in hospital or user is that patient or hospital user
        if (r === 'hospital') {
          const hospital = await Hospital.findOne({ userId })
          return hospital && String(hospital._id) === hospitalId
        }
        if (r === 'patient') {
          if (String(userId) === patientId) return true
          // allow if this user owns the Patient document referenced by patientId
          try {
            const pat = await Patient.findById(patientId)
            if (pat && String(pat.userId) === String(userId)) return true
          } catch (e) {
            // ignore
          }
          return false
        }
        if (r === 'donor') {
          const donor = await Donor.findOne({ userId })
          return donor && String(donor.hospital || '') === hospitalId
        }
      }
      if (donorIndex !== -1 && hospIndex !== -1) {
        const hospitalId = parts[hospIndex + 1]
        const donorId = parts[donorIndex + 1]
        if (r === 'hospital') {
          const hospital = await Hospital.findOne({ userId })
          return hospital && String(hospital._id) === hospitalId
        }
        if (r === 'donor') return String(userId) === donorId
      }
    }

    if (roomId.startsWith('room_ngo_')) {
      // room_ngo_{ngoId}_patient_{patientId}
      const parts = roomId.split('_')
      const ngoIndex = parts.indexOf('ngo')
      const patientIndex = parts.indexOf('patient')
      if (ngoIndex !== -1 && patientIndex !== -1) {
        const ngoId = parts[ngoIndex + 1]
        const patientId = parts[patientIndex + 1]
        if (r === 'ngo') {
          const ngo = await NGO.findOne({ userId })
          return ngo && String(ngo._id) === ngoId
        }
        if (r === 'patient') {
          if (String(userId) === patientId) return true
          try {
            const pat = await Patient.findById(patientId)
            if (pat && String(pat.userId) === String(userId)) return true
          } catch (e) {}
          return false
        }
      }
    }

    if (roomId.startsWith('room_donor_')) {
      // room_donor_{donorId}_patient_{patientId}_hospital_{patientHospitalId}
      const parts = roomId.split('_')
      const donorIndex = parts.indexOf('donor')
      const patientIndex = parts.indexOf('patient')
      if (donorIndex !== -1 && patientIndex !== -1) {
        const donorId = parts[donorIndex + 1]
        const patientId = parts[patientIndex + 1]
        if (r === 'donor') return String(userId) === donorId
        if (r === 'patient') {
          if (String(userId) === patientId) return true
          try {
            const pat = await Patient.findById(patientId)
            if (pat && String(pat.userId) === String(userId)) return true
          } catch (e) {}
          return false
        }
      }
    }

    if (roomId.startsWith('room_hospital_') && roomId.includes('_hospital_')) {
      // hospital <-> hospital
      const parts = roomId.split('_')
      const idx = parts.indexOf('hospital')
      const id1 = parts[idx + 1]
      const id2 = parts[idx + 3]
      if (r === 'hospital') {
        const hospital = await Hospital.findOne({ userId })
        return hospital && (String(hospital._id) === id1 || String(hospital._id) === id2)
      }
    }

    // default deny
    return false
  } catch (err) {
    console.error('canAccessRoom error', err)
    return false
  }
}
