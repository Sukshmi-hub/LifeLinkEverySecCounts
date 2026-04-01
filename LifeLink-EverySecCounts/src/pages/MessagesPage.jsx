import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import { serverUrl } from '@/lib/serverConfig'

export default function MessagesPage() {
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage, markRead } = useChat(serverUrl)
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
    if (res && res.success) {
      const msgs = await loadHistory(roomId)
      try {
        const myId = String((localStorage.getItem('userId')) || '')
        const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
        if (unreadIds.length > 0) markRead(roomId, unreadIds)
        setTimeout(() => loadRooms(), 300)
      } catch (e) {}
    }
  }

  return (
    <div className="flex h-full">
      <ChatList rooms={rooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} />
      <ChatWindow roomId={state.activeRoomId} chat={state} onSend={sendMessage} />
    </div>
  )
}
