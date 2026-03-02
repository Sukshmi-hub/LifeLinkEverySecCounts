// src/routes/chat.js
import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getRoomHistory, getRoomsForUser, markMessageRead } from '../controllers/chatController.js'

const router = express.Router()

router.get('/history/:roomId', authMiddleware, getRoomHistory)
router.get('/rooms', authMiddleware, getRoomsForUser)
router.patch('/messages/:messageId/read', authMiddleware, markMessageRead)

export default router
