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
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage, markRead } = useChat(serverUrl)
  const [rooms, setRooms] = useState([])
  const [selectedRoomObj, setSelectedRoomObj] = useState(null)

  const isPaymentDone = (request) => Boolean(request?.paymentReceived) || String(request?.paymentStatus || '').toLowerCase() === 'success'

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

  const visibleRooms = useMemo(() => {
    const ngoId = String(user?.id || user?._id || '').trim()
    if (!ngoId) return []

    const activeFundPatientIds = new Set(
      (Array.isArray(fundRequests) ? fundRequests : [])
        .filter((request) => request && !isPaymentDone(request))
        .map((request) => String(request.patientId || '').trim())
        .filter(Boolean)
    )

    return rooms.filter((room) => {
      const roomId = String(room?.roomId || '')
      const match = roomId.match(/^room_ngo_([^_]+)_patient_([^_]+)$/)
      if (!match) return false
      if (match[1] !== ngoId) return false
      return activeFundPatientIds.has(match[2])
    })
  }, [rooms, fundRequests, user?.id, user?._id])

  // If activeRoomId is already present (e.g., restored from socket or previous session),
  // set the selectedRoomObj so the header shows the correct name on load.
  useEffect(() => {
    if (!state?.activeRoomId || !rooms || rooms.length === 0) return
    const room = rooms.find(r => String(r.roomId) === String(state.activeRoomId)) || null
    if (room) setSelectedRoomObj(room)
  }, [state?.activeRoomId, rooms])

  const handleSelect = async (roomId) => {
    const res = await joinRoom(roomId)
    if (res && res.success) {
      // set selected room metadata so ChatWindow can display title/subtitle
      const room = rooms.find(r => String(r.roomId) === String(roomId)) || null
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
