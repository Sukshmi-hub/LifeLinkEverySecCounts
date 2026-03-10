import Tribute from '../models/Tribute.js'

export const createTribute = async (req, res) => {
  try {
    // Only hospitals may create tributes
    if (!req.user || req.user.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Only hospitals can submit tributes' })
    }

    const {
      donorName,
      age,
      location,
      donationType,
      familyName,
      familyMessage,
      photoUrl,
      isPublic,
    } = req.body

    // Validate age range 18-70 if provided
    if (age !== undefined && age !== null && age !== '') {
      const ageNum = Number(age);
      if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 70) {
        return res.status(400).json({ success: false, message: 'Age must be a number between 18 and 70' })
      }
    }

      // Manual aboutDonor length validation (trimmed)
      const aboutDonor = (req.body.aboutDonor || familyMessage || '').trim()
      if (aboutDonor.length < 20) {
        return res.status(400).json({ success: false, message: 'aboutDonor must be at least 20 characters' })
      }

    // Count active tributes for this hospital
    const activeCount = await Tribute.countDocuments({ hospitalId: req.user.id, status: 'active' })
    if (activeCount >= 3) {
      return res.status(400).json({ success: false, message: 'You have reached the maximum limit of 3 active tributes. Please archive one before adding a new tribute.' })
    }

    const tribute = new Tribute({
      donorName,
      age,
      location,
      donationType,
      hospitalName: req.body.hospitalName || req.user.name || '',
      aboutDonor,
      photoUrl,
      isPublic: !!isPublic,
      hospitalId: req.user.id,
    })

    const savedTribute = await tribute.save()

    return res.status(201).json({ success: true, message: 'Tribute submitted successfully', tribute: savedTribute })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create tribute' })
  }
}

export const getMyTributes = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Only hospitals can view their tributes' })
    }

    const tributes = await Tribute.find({ hospitalId: req.user.id }).sort({ createdAt: -1 })
    return res.json({ success: true, tributes })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tributes' })
  }
}
