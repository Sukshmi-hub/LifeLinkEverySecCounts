import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import { useAuth } from '@/context/AuthContext'

export default function HospitalMessages() {
  const serverUrl = 'http://localhost:5000'
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage, markRead } = useChat(serverUrl)
  const { user } = useAuth() || {}
  const [rooms, setRooms] = useState([])

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

  const handleSelect = async (roomId) => {
    const res = await joinRoom(roomId)
    if (res && res.success) await loadHistory(roomId)
  }

  // enhance to mark messages read when opening
  const handleSelectEnhanced = async (roomId) => {
    const res = await joinRoom(roomId)
    let msgs = []
    if (res && res.success) {
      msgs = await loadHistory(roomId) || []
    } else {
      // fallback
      msgs = await loadHistory(roomId) || []
    }
    try {
      const myId = String((localStorage.getItem('userId')) || '')
      const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
      if (unreadIds.length > 0) {
        markRead(roomId, unreadIds)
        // Reload rooms to clear unread badges
        setTimeout(() => loadRooms(), 300)
      }
    } catch (e) {}
  }

  return (
    <div className="flex h-[calc(100vh-160px)]">
      <div className="w-64 lg:w-64">
        <ChatList rooms={rooms} activeRoomId={state.activeRoomId} onSelect={handleSelectEnhanced} messages={state.messages} />
      </div>
      <div className="flex-1">
        {(() => {
          const selected = rooms.find(r => r.roomId === state.activeRoomId)
          let chatProp = { ...state, title: selected?.title, subtitle: selected?.subtitle }
          // For hospital users, show patient name as primary and hospital as subtitle
          if (user && String(user.role).toLowerCase() === 'hospital') {
            chatProp = { ...state, title: selected?.subtitle || selected?.title, subtitle: selected?.title || selected?.subtitle }
          }
          return <ChatWindow roomId={state.activeRoomId} chat={chatProp} onSend={sendMessage} />
        })()}
      </div>
    </div>
  )
}