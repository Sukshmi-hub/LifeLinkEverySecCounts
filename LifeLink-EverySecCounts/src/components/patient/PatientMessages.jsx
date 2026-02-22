import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'

export default function PatientMessages() {
  const serverUrl = 'http://localhost:5000'
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage, connect, setActiveRoomLocal, markRead } = useChat(serverUrl)
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/chat/rooms`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!res.ok) return
        const json = await res.json()
        if (json.success) setRooms(json.data)
      } catch (err) {
        console.error('Failed to fetch rooms', err)
      }
    })()
  }, [])

  // Ensure socket is connected when this page mounts
  useEffect(() => {
    try {
      connect && connect()
    } catch (err) {
      // ignore
    }
  }, [connect])

  // Auto-join first room when rooms are loaded and socket is connected
  useEffect(() => {
    if (rooms.length === 0) return
    // If already have an active room, don't override
    if (state?.activeRoomId) return
    // Wait for socket connection before joining
    if (!isConnected) return

    const first = rooms[0].roomId
    if (first) handleSelect(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, isConnected, state?.activeRoomId])

  const handleSelect = async (roomId) => {
    // Try to join via socket; if socket isn't ready, fall back to local activeRoom + REST history
    const res = await joinRoom(roomId)
    if (res && res.success) {
      const msgs = await loadHistory(roomId)
      try {
        const myId = String((localStorage.getItem('userId')) || '')
        const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
        if (unreadIds.length > 0) markRead(roomId, unreadIds)
      } catch (e) {}
      return
    }

    // fallback: set active room locally and still load history via REST
    try {
      if (typeof setActiveRoomLocal === 'function') {
        setActiveRoomLocal(roomId)
      }
      const msgs = await loadHistory(roomId)
      try {
        const myId = String((localStorage.getItem('userId')) || '')
        const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
        if (unreadIds.length > 0) markRead(roomId, unreadIds)
      } catch (e) {}
    } catch (err) {
      console.error('Failed to open room', err)
    }
  }

  return (
    <div className="flex h-[calc(100vh-160px)]">
      <div className="w-64 lg:w-64">
        <ChatList rooms={rooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} />
      </div>
      <div className="flex-1">
        {(() => {
          const selected = rooms.find(r => r.roomId === state.activeRoomId)
          const chatProp = { ...state, title: selected?.title, subtitle: selected?.subtitle }
          return <ChatWindow roomId={state.activeRoomId} chat={chatProp} onSend={sendMessage} />
        })()}
      </div>
    </div>
  )
}