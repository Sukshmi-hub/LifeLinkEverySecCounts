import User from '../models/User.js'
import Request from '../models/Request.js'
import Notification from '../models/Notification.js'

export const getAdminDashboardData = async (req, res) => {
  try {
    // 1. Get total users count and distribution by role
    const totalUsers = await User.countDocuments()
    
    const userDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])

    // Convert to object format for easier access
    const distribution = {}
    let totalForPercentage = 0
    userDistribution.forEach(item => {
      distribution[item._id] = item.count
      totalForPercentage += item.count
    })

    // Calculate percentages
    const percentages = {}
    Object.keys(distribution).forEach(role => {
      percentages[role] = Math.round((distribution[role] / totalForPercentage) * 100)
    })

    // 2. Get recent activities from Request and Notification models (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get recent requests
    const recentRequests = await Request.find({
      createdAt: { $gte: thirtyDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('status requestType patientHospitalName createdAt')
      .lean()

    // Get recent notifications
    const recentNotifications = await Notification.find({
      timestamp: { $gte: thirtyDaysAgo }
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('title message type timestamp')
      .lean()

    // Merge and sort by date
    const activities = []

    // Add request activities
    recentRequests.forEach(req => {
      const statusMap = {
        'pending': 'Pending verification',
        'approved': 'Request approved',
        'rejected': 'Request rejected',
        'SentToHospital': 'Sent to hospital',
        'VerifiedByHospital': 'Verified by hospital',
        'Donor Matched': 'Donor matched'
      }

      const typeMap = {
        'user_verification': 'User registration',
        'organ_request': 'Organ request',
        'donor_registration': 'Donor registration',
        'fund_request': 'Fund request'
      }

      activities.push({
        id: req._id,
        title: typeMap[req.requestType] || 'Request',
        message: statusMap[req.status] || req.status,
        type: req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'info',
        timestamp: new Date(req.createdAt)
      })
    })

    // Add notification activities
    recentNotifications.forEach(notif => {
      activities.push({
        id: notif._id,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        timestamp: new Date(notif.timestamp)
      })
    })

    // Sort by timestamp descending and take top 8
    activities.sort((a, b) => b.timestamp - a.timestamp)
    const topActivities = activities.slice(0, 8)

    // 3. Calculate system health
    // System health is based on operational status of key components
    // For now, we'll consider the system healthy if database is accessible
    const systemHealth = 100 // Default to 100% if no issues

    // 4. Get count of pending requests
    const pendingRequests = await Request.countDocuments({ status: 'pending' })

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        userDistribution: {
          patients: distribution['patient'] || 0,
          donors: distribution['donor'] || 0,
          hospitals: distribution['hospital'] || 0,
          ngos: distribution['ngo'] || 0
        },
        userPercentages: {
          patients: percentages['patient'] || 0,
          donors: percentages['donor'] || 0,
          hospitals: percentages['hospital'] || 0,
          ngos: percentages['ngo'] || 0
        },
        recentActivities: topActivities.map(activity => ({
          id: activity.id,
          title: activity.title,
          message: activity.message,
          type: activity.type,
          timestamp: activity.timestamp
        })),
        systemHealth,
        pendingRequests
      }
    })
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    })
  }
}

/**
 * Get all users from the database with their details
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, status } = req.query

    // Build filter object
    const filter = {}
    
    if (role && role !== 'all') {
      filter.role = role
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    if (status) {
      filter.is_active = status === 'active'
    }

    // Fetch users
    const users = await User.find(filter)
      .select('name email role createdAt is_active')
      .sort({ createdAt: -1 })
      .lean()

    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.is_active ? 'active' : 'inactive',
      createdAt: user.createdAt.toISOString().split('T')[0]
    }))

    res.status(200).json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    })
  }
}
