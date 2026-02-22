// src/controllers/chatController.js
import Message from '../models/Message.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

// Fetch paginated message history for a room
export const getRoomHistory = async (req, res) => {
  try {
    const { roomId } = req.params
    const limit = parseInt(req.query.limit || '20', 10)
    const offset = parseInt(req.query.offset || '0', 10)

    if (!roomId) return res.status(400).json({ success: false, message: 'roomId required' })

    // TODO: validate user has access to room — for now rely on authMiddleware and later socket validation
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)

    return res.json({ success: true, data: messages.reverse() })
  } catch (err) {
    console.error('getRoomHistory error', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// List rooms accessible to the user (simple implementation: aggregate unread counts by room)
export const getRoomsForUser = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })
    const User = (await import('../models/User.js')).default
    const Patient = (await import('../models/Patient.js')).default
    const Donor = (await import('../models/Donor.js')).default
    const Hospital = (await import('../models/Hospital.js')).default
    const NGO = (await import('../models/NGO.js')).default

    const role = String(req.user.role || '').toLowerCase()
    const roomsSet = new Set()

    // Helper to add room and ensure unique
    const addRoom = (roomId) => { if (roomId) roomsSet.add(roomId) }

    // Load role specific rooms
    if (role === 'patient') {
      const patient = await Patient.findOne({ userId: userId })
      if (patient) {
        const pid = String(patient._id)
        if (patient.hospital) addRoom(`room_hospital_${String(patient.hospital)}_patient_${pid}`)

        // Requests by patient -> include rooms where messages may be/ngo related
        const requests = await (await import('../models/Request.js')).default.find({ patientId: patient._id })
        for (const r of requests) {
          if (r.hospitalId) addRoom(`room_hospital_${String(r.hospitalId)}_patient_${pid}`)
          if (r.donorId) addRoom(`room_donor_${String(r.donorId)}_patient_${pid}_hospital_${String(r.hospitalId || '')}`)
        }

        // Also include any rooms where messages contain this patient id in the room name
        const messageRooms = await Message.distinct('roomId', { roomId: { $regex: `patient_${pid}` } })
        messageRooms.forEach(addRoom)
      }
    }

    if (role === 'hospital') {
      const hospital = await Hospital.findOne({ userId: userId })
      if (hospital) {
        const hid = String(hospital._id)
        // admitted patients
        const patients = await Patient.find({ hospital: hospital._id })
        patients.forEach(p => addRoom(`room_hospital_${hid}_patient_${String(p._id)}`))

        // admitted donors (donor.hospital may be stored in donor doc)
        const donors = await Donor.find({ hospital: hospital._id })
        donors.forEach(d => addRoom(`room_hospital_${hid}_donor_${String(d._id)}`))

        // include rooms where messages reference this hospital
        const messageRooms = await Message.distinct('roomId', { roomId: { $regex: `hospital_${hid}` } })
        messageRooms.forEach(addRoom)
      }
    }

    if (role === 'donor') {
      const donor = await Donor.findOne({ userId: userId })
      if (donor) {
        const did = String(donor._id)
        if (donor.hospital) addRoom(`room_hospital_${String(donor.hospital)}_donor_${did}`)

        // patients in donor's hospital
        if (donor.hospital) {
          const patients = await Patient.find({ hospital: donor.hospital })
          patients.forEach(p => addRoom(`room_donor_${did}_patient_${String(p._id)}_hospital_${String(p.hospital)}`))
        }

        const messageRooms = await Message.distinct('roomId', { roomId: { $regex: `donor_${did}` } })
        messageRooms.forEach(addRoom)
      }
    }

    if (role === 'ngo') {
      const ngo = await NGO.findOne({ userId: userId })
      if (ngo) {
        const nid = String(ngo._id)
        // include any rooms where NGO is referenced in messages
        const messageRooms = await Message.distinct('roomId', { roomId: { $regex: `ngo_${nid}` } })
        messageRooms.forEach(addRoom)

        // Include rooms from fund requests where ngoId matches
        const requests = await (await import('../models/Request.js')).default.find({ ngoId: ngo._id })
        for (const r of requests) {
          if (r.patientId) addRoom(`room_ngo_${nid}_patient_${String(r.patientId)}`)
        }
      }
    }

    // Fallback: include rooms where user has sent messages
    const sentRooms = await Message.distinct('roomId', { senderId: userId })
    sentRooms.forEach(addRoom)

    // Build result: get last message and unread count per room
    const rooms = []
    for (const rid of Array.from(roomsSet)) {
      const last = await Message.findOne({ roomId: rid }).sort({ timestamp: -1 }).lean()
      const unread = await Message.countDocuments({ roomId: rid, isRead: false, senderId: { $ne: userId } })

      // Build human friendly label
      let title = rid
      let subtitle = ''

      try {
        if (rid.startsWith('room_hospital_') && rid.includes('_patient_')) {
          const parts = rid.split('_')
          const hIndex = parts.indexOf('hospital')
          const pIndex = parts.indexOf('patient')
          const hid = parts[hIndex + 1]
          const pid = parts[pIndex + 1]
          const hosp = await Hospital.findById(hid).lean()
          const pat = await Patient.findById(pid).lean()
          title = hosp ? hosp.name : `Hospital ${hid}`
          subtitle = pat ? (pat.name || pat.fullName || 'Patient') : `Patient ${pid}`
        } else if (rid.startsWith('room_hospital_') && rid.includes('_donor_')) {
          const parts = rid.split('_')
          const hIndex = parts.indexOf('hospital')
          const dIndex = parts.indexOf('donor')
          const hid = parts[hIndex + 1]
          const did = parts[dIndex + 1]
          const hosp = await Hospital.findById(hid).lean()
          const donor = await Donor.findById(did).lean()
          title = hosp ? hosp.name : `Hospital ${hid}`
          subtitle = donor ? (donor.name || donor.fullName || 'Donor') : `Donor ${did}`
        } else if (rid.startsWith('room_ngo_') && rid.includes('_patient_')) {
          const parts = rid.split('_')
          const ngoIndex = parts.indexOf('ngo')
          const pIndex = parts.indexOf('patient')
          const nid = parts[ngoIndex + 1]
          const pid = parts[pIndex + 1]
          const ngo = await NGO.findById(nid).lean()
          const pat = await Patient.findById(pid).lean()
          title = ngo ? (ngo.name || ngo.organizationName) : `NGO ${nid}`
          subtitle = pat ? (pat.name || pat.fullName || 'Patient') : `Patient ${pid}`
        } else if (rid.startsWith('room_donor_') && rid.includes('_patient_')) {
          const parts = rid.split('_')
          const donorIndex = parts.indexOf('donor')
          const pIndex = parts.indexOf('patient')
          const did = parts[donorIndex + 1]
          const pid = parts[pIndex + 1]
          const donor = await Donor.findById(did).lean()
          const pat = await Patient.findById(pid).lean()
          title = donor ? (donor.name || donor.fullName || 'Donor') : `Donor ${did}`
          subtitle = pat ? (pat.name || pat.fullName || 'Patient') : `Patient ${pid}`
        } else {
          // Fall back to parse hospital or ngo tokens
          if (rid.includes('hospital_')) {
            const m = rid.match(/hospital_([0-9a-fA-F]{24})/)
            if (m) {
              const hosp = await Hospital.findById(m[1]).lean()
              if (hosp) title = hosp.name
            }
          }
        }
      } catch (err) {
        // ignore label errors
      }

      rooms.push({ roomId: rid, title, subtitle, lastMessage: last, unreadCount: unread })
    }

    // sort by lastMessage timestamp desc
    rooms.sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0
      return tb - ta
    })

    return res.json({ success: true, data: rooms })
  } catch (err) {
    console.error('getRoomsForUser error', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Mark message as read
export const markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params
    const updated = await Message.findByIdAndUpdate(messageId, { isRead: true }, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Message not found' })
    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('markMessageRead error', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export default { getRoomHistory, getRoomsForUser, markMessageRead }
