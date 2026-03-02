import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'

export default function NgoMessages() {
  const serverUrl = 'http://localhost:5000'
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage } = useChat(serverUrl)
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

  const handleSelect = async (roomId) => {
    const res = await joinRoom(roomId)
    if (res && res.success) await loadHistory(roomId)
  }

  return (
    <div className="flex h-full">
      <ChatList rooms={rooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} />
      <ChatWindow roomId={state.activeRoomId} chat={state} onSend={sendMessage} />
    </div>
  )
  }