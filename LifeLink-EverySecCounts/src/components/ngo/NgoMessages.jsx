import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'

export default function NgoMessages() {
  const serverUrl = 'http://localhost:5000'
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage } = useChat(serverUrl)
  const [rooms, setRooms] = useState([])
  const [selectedRoomObj, setSelectedRoomObj] = useState(null)

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
      await loadHistory(roomId)
    }
  }

  // Compose chat object with selected room metadata so header shows contact name
  const chatWithMeta = { ...state, title: selectedRoomObj?.title, subtitle: selectedRoomObj?.subtitle }

  return (
    <div className="flex h-full">
      <ChatList rooms={rooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} />
      <ChatWindow roomId={state.activeRoomId} chat={chatWithMeta} onSend={sendMessage} />
    </div>
  )
  }