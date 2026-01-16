import express from 'express'
import User from '../models/User.js'
import Patient from '../models/Patient.js'
import Donor from '../models/Donor.js'
import Hospital from '../models/Hospital.js'
import NGO from '../models/NGO.js'
import Admin from '../models/Admin.js'

const router = express.Router()

// Dev-only: list collection indexes to help debug duplicate-key issues
router.get('/indexes', async (req, res) => {
  try {
    const results = await Promise.allSettled([
      User.collection.indexes(),
      Patient.collection.indexes(),
      Donor.collection.indexes(),
      Hospital.collection.indexes(),
      NGO.collection.indexes(),
      Admin.collection.indexes(),
    ])

    const payload = {
      user: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason },
      patient: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason },
      donor: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason },
      hospital: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason },
      ngo: results[4].status === 'fulfilled' ? results[4].value : { error: results[4].reason },
      admin: results[5].status === 'fulfilled' ? results[5].value : { error: results[5].reason },
    }

    res.json({ success: true, data: payload })
  } catch (err) {
    console.error('Debug indexes error:', err)
    res.status(500).json({ success: false, message: 'Failed to list indexes', error: err.message })
  }
})

export default router
