import React, { useEffect, useMemo, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { serverUrl } from '@/lib/serverConfig'

export default function NgoMessages() {
  const { user } = useAuth()
  const { fundRequests, loadNgoFundRequests } = useNotifications()
  const { state, joinRoom, loadHistory, sendMessage, markRead } = useChat(serverUrl)
  const [rooms, setRooms] = useState([])
  const [selectedRoomObj, setSelectedRoomObj] = useState(null)
  const [ngoRequests, setNgoRequests] = useState([])

  const extractId = (value) => {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      if (value._id && typeof value._id === 'string') return value._id
      if (value.id && typeof value.id === 'string') return value.id
      if (value._id && typeof value._id === 'object' && value._id.$oid) return value._id.$oid
      if (value.$oid) return value.$oid
    }
    return null
  }

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${serverUrl}/api/chat/rooms`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setRooms(json.data)
    } catch (err) {
      console.error('Failed to fetch rooms', err)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    if (user?.role === 'ngo' && user?.id && typeof loadNgoFundRequests === 'function') {
      loadNgoFundRequests(user.id)
    }
  }, [user?.id, user?.role, loadNgoFundRequests])

  useEffect(() => {
    const loadNgoRequests = async () => {
      if (user?.role !== 'ngo' || !user?.id) return
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/requests?ngoId=${encodeURIComponent(user.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json && json.success && Array.isArray(json.data)) {
          setNgoRequests(json.data)
        }
      } catch (err) {
        console.error('Failed to load NGO requests for messages', err)
      }
    }

    loadNgoRequests()
  }, [user?.id, user?.role])

  const visibleRooms = useMemo(() => {
    const ngoId = String(user?.id || user?._id || '').trim()
    if (!ngoId) return []

    const mergedRooms = new Map()
    const validRoomIds = new Set()

    const addRoom = (room) => {
      if (!room || !room.roomId) return
      mergedRooms.set(String(room.roomId), room)
    }

    // Keep backend-provided rooms.
    ;(Array.isArray(rooms) ? rooms : []).forEach(addRoom)

    const allFundRequests = [
      ...(Array.isArray(fundRequests) ? fundRequests : []),
      ...(Array.isArray(ngoRequests) ? ngoRequests : []),
    ]

    // Ensure every NGO fund request creates a visible conversation,
    // even if the room list has not been refreshed yet.
    ;(allFundRequests).forEach((request) => {
      if (!request) return
      const patientId = String(extractId(request.patientId) || request.patientId || '').trim()
      if (!patientId) return
      const requestNgoId = String(extractId(request.ngoId) || request.ngoId || user?.id || user?._id || '').trim()
      if (!requestNgoId) return

      const roomId = `room_ngo_${requestNgoId}_patient_${patientId}`
      validRoomIds.add(roomId)
      addRoom({
        roomId,
        title: user?.name || user?.organizationName || 'NGO',
        subtitle: request.patientName || request.patientId?.name || 'Patient',
        lastMessage: null,
        unreadCount: 0,
      })
    })

    return Array.from(mergedRooms.values()).filter((room) => {
      const roomId = String(room?.roomId || '')
      const match = roomId.match(/^room_ngo_([^_]+)_patient_([^_]+)$/)
      if (!match) return false
      if (validRoomIds.size === 0) return true
      return validRoomIds.has(roomId)
    })
  }, [rooms, fundRequests, ngoRequests, user?.id, user?._id, user?.name, user?.organizationName])

  // If activeRoomId is already present (e.g., restored from socket or previous session),
  // set the selectedRoomObj so the header shows the correct name on load.
  useEffect(() => {
    if (!state?.activeRoomId) return
    const room = visibleRooms.find(r => String(r.roomId) === String(state.activeRoomId)) || null
    if (room) setSelectedRoomObj(room)
  }, [state?.activeRoomId, visibleRooms])

  const handleSelect = async (roomId) => {
    const res = await joinRoom(roomId)
    if (res && res.success) {
      // set selected room metadata so ChatWindow can display title/subtitle
      const room = visibleRooms.find(r => String(r.roomId) === String(roomId)) || null
      setSelectedRoomObj(room)
      const msgs = await loadHistory(roomId)
      try {
        const myId = String((localStorage.getItem('userId')) || '')
        const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
        if (unreadIds.length > 0) markRead(roomId, unreadIds)
        setTimeout(() => loadRooms(), 300)
      } catch (e) {}
    }
  }

  // Compose chat object with selected room metadata so header shows contact name
  const chatWithMeta = { ...state, title: selectedRoomObj?.title, subtitle: selectedRoomObj?.subtitle }

  return (
    <div className="flex h-full">
      <ChatList rooms={visibleRooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} />
      <ChatWindow roomId={state.activeRoomId} chat={chatWithMeta} onSend={sendMessage} />
    </div>
  )
}
