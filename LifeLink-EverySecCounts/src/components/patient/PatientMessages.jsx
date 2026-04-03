import React, { useEffect, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import { serverUrl } from '@/lib/serverConfig'

export default function PatientMessages() {
  const { socket, isConnected, connectionError, state, joinRoom, loadHistory, sendMessage, connect, setActiveRoomLocal, markRead } = useChat(serverUrl)
  const [rooms, setRooms] = useState([])
  const [profile, setProfile] = useState(null)

  const loadRooms = async () => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/chat/rooms`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        if (json.success) setRooms(json.data)
      } catch (err) {
        console.error('Failed to fetch rooms', err)
      }
    })()
  }

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/profile`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        if (json.success) setProfile(json.data?.user || null)
      } catch (err) {
        console.error('Failed to fetch patient profile', err)
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

    const hospitalRooms = rooms.filter(r => String(r.roomId || '').startsWith('room_hospital_'))
    const ngoRooms = rooms.filter(r => String(r.roomId || '').startsWith('room_ngo_'))
    const primaryHospitalRoomId = profile?.hospital?._id && profile?.patientId
      ? `room_hospital_${String(profile.hospital._id)}_patient_${String(profile.patientId)}`
      : null
    const first = (hospitalRooms.find(r => r.roomId === primaryHospitalRoomId) || hospitalRooms[0] || ngoRooms[0] || rooms[0])?.roomId
    if (first) handleSelect(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, isConnected, state?.activeRoomId, profile])

  const handleSelect = async (roomId) => {
    // Try to join via socket; if socket isn't ready, fall back to local activeRoom + REST history
    const res = await joinRoom(roomId)
    if (res && res.success) {
      const msgs = await loadHistory(roomId)
      try {
        const myId = String((localStorage.getItem('userId')) || '')
        const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
        if (unreadIds.length > 0) markRead(roomId, unreadIds)
        setTimeout(() => loadRooms(), 300)
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
        setTimeout(() => loadRooms(), 300)
      } catch (e) {}
    } catch (err) {
      console.error('Failed to open room', err)
    }
  }

  const hospitalRooms = rooms.filter(r => String(r.roomId || '').startsWith('room_hospital_'))
  const ngoRooms = rooms.filter(r => String(r.roomId || '').startsWith('room_ngo_'))
  const primaryHospitalRoomId = profile?.hospital?._id && profile?.patientId
    ? `room_hospital_${String(profile.hospital._id)}_patient_${String(profile.patientId)}`
    : null
  const primaryHospitalName = profile?.hospital?.name || profile?.hospitalName || profile?.admittedHospital || ''
  const primaryHospitalRoom = primaryHospitalRoomId
    ? (hospitalRooms.find(r => r.roomId === primaryHospitalRoomId) || (primaryHospitalName ? {
        roomId: primaryHospitalRoomId,
        title: primaryHospitalName,
        subtitle: 'Primary Hospital',
        lastMessage: null,
        unreadCount: 0,
      } : null))
    : null
  const hospitalRoomsVisible = primaryHospitalRoom
    ? [primaryHospitalRoom, ...hospitalRooms.filter(r => r.roomId !== primaryHospitalRoom.roomId)]
    : hospitalRooms
  const visibleRooms = [...hospitalRoomsVisible, ...ngoRooms]

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="w-64 lg:w-64 overflow-y-auto flex flex-col min-h-0">
        {primaryHospitalName && primaryHospitalRoomId && (
          <div className="mb-2">
            <div className="text-xl font-semibold mb-2">Registered Hospital</div>
            <div
              className={`p-3 border-b cursor-pointer transition-colors ${state.activeRoomId === primaryHospitalRoomId ? 'bg-destructive/10' : 'hover:bg-destructive/5'}`}
              onClick={() => handleSelect(primaryHospitalRoomId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 21V9h10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M10 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{primaryHospitalName}</div>
                  <div className="text-xs text-muted-foreground truncate">Primary Hospital</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <ChatList rooms={hospitalRoomsVisible} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} heading="Requested In Hospital" />
        <div className="mt-2">
          <ChatList rooms={ngoRooms} activeRoomId={state.activeRoomId} onSelect={handleSelect} messages={state.messages} heading="NGOs" />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {(() => {
          const selected = visibleRooms.find(r => r.roomId === state.activeRoomId)
          const chatProp = { ...state, title: selected?.title, subtitle: selected?.subtitle }
          return <ChatWindow roomId={state.activeRoomId} chat={chatProp} onSend={sendMessage} />
        })()}
      </div>
    </div>
  )
}

