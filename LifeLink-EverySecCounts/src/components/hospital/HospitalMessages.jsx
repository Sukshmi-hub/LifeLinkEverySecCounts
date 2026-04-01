import React, { useEffect, useMemo, useState } from 'react'
import useChat from '@/hooks/useChat'
import ChatWindow from '@/components/chat/ChatWindow'
import { useAuth } from '@/context/AuthContext'
import { serverUrl } from '@/lib/serverConfig'

const SECTION_ORDER = [
  'registeredPatients',
  'organRequests',
  'hospitalChats',
  'acceptedDonors',
]

const SECTION_META = {
  registeredPatients: {
    title: 'Patients Registered With This Hospital',
    description: 'Patients who selected this hospital during registration.',
  },
  organRequests: {
    title: 'Patients Requesting Organ Support',
    description: 'Patients who opened an organ request to this hospital.',
  },
  hospitalChats: {
    title: 'Hospital-to-Hospital Chats',
    description: 'Matched hospital conversations for shared patient care.',
  },
  acceptedDonors: {
    title: 'Accepted Donor Chats',
    description: 'Donor conversations the hospital has already accepted.',
  },
}

const REQUEST_KEYWORDS = /organ request|requesting organ|requested organ|request for organ/i

const getTimestamp = (room) => {
  try {
    const t = room?.lastMessage?.timestamp || room?.lastMessage?.createdAt || room?.lastMessageTime || room?.updatedAt || room?.createdAt
    return t ? new Date(t).getTime() : 0
  } catch (e) {
    return 0
  }
}

const getRoomCategory = (room) => {
  const rid = String(room?.roomId || '')
  const title = String(room?.title || '').toLowerCase()
  const subtitle = String(room?.subtitle || '').toLowerCase()
  const lastContent = String(room?.lastMessage?.content || '').toLowerCase()
  const joinedText = `${title} ${subtitle} ${lastContent}`.trim()

  if (rid.includes('_donor_')) return 'acceptedDonors'
  if (/room_hospital_[^_]+_hospital_[^_]+/i.test(rid)) return 'hospitalChats'
  if (rid.includes('_patient_')) {
    if (subtitle.includes('recent request hospital') || title.includes('recent request hospital')) {
      return 'organRequests'
    }
    if (REQUEST_KEYWORDS.test(joinedText) && !subtitle.includes('primary hospital')) {
      return 'organRequests'
    }
    if (subtitle.includes('primary hospital') || title.includes('primary hospital')) {
      return 'registeredPatients'
    }
    return REQUEST_KEYWORDS.test(joinedText) ? 'organRequests' : 'registeredPatients'
  }

  return 'registeredPatients'
}

const getDisplayPrimary = (room, isHospitalUser) => {
  if (!room) return 'Conversation'
  if (isHospitalUser) return room.subtitle || room.title || room.roomId || 'Conversation'
  return room.title || room.roomId || 'Conversation'
}

const getDisplaySecondary = (room, isHospitalUser) => {
  if (!room) return ''
  const primary = getDisplayPrimary(room, isHospitalUser)
  const secondary = isHospitalUser ? (room.title || '') : (room.subtitle || '')
  if (!secondary || secondary === primary) return ''
  return secondary
}

export default function HospitalMessages() {
  const { state, joinRoom, loadHistory, sendMessage, markRead } = useChat(serverUrl)
  const { user } = useAuth() || {}
  const [rooms, setRooms] = useState([])
  const [hospitalChatRooms, setHospitalChatRooms] = useState([])
  const [hospitalPatientNames, setHospitalPatientNames] = useState({})
  const [openSections, setOpenSections] = useState({
    registeredPatients: true,
    organRequests: true,
    hospitalChats: true,
    acceptedDonors: true,
  })

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${serverUrl}/api/chat/rooms`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      if (!res.ok) return
      const json = await res.json().catch(() => ({}))
      if (json.success) setRooms(json.data)
    } catch (err) {
      console.error('Failed to fetch rooms', err)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    const loadHospitalProfileAndChats = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/hospital/me`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        const hospitalId = String(json?.data?.hospitalId || json?.data?._id || json?.data?.id || localStorage.getItem('hospitalId') || '')

        const patients = Array.isArray(json?.data?.admitted_patients) ? json.data.admitted_patients : []
        const map = {}
        for (const patient of patients) {
          const id = String(patient?._id || '')
          if (!id) continue
          map[id] = patient?.fullName || patient?.name || patient?.email || 'Patient'
        }
        setHospitalPatientNames(map)

        if (!hospitalId) return
        const requestsResp = await fetch(`${serverUrl}/api/requests?hospitalId=${encodeURIComponent(hospitalId)}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        })
        if (!requestsResp.ok) return
        const requestsJson = await requestsResp.json().catch(() => ({}))
        const requestList = Array.isArray(requestsJson?.data) ? requestsJson.data : []

        const syntheticRoomsMap = new Map()
        for (const req of requestList) {
          const counterpartId = String(req?.sentFromHospitalId || req?.matchedDonor?.senderHospitalId || '')
          const counterpartName = String(req?.sentFromHospitalName || req?.matchedDonor?.senderHospitalName || req?.receivingHospitalName || req?.hospitalId?.name || '').trim()
          if (!counterpartId && !counterpartName) continue

          const roomId = counterpartId
            ? `room_hospital_${counterpartId}_hospital_${hospitalId}`
            : `room_hospital_${counterpartName.replace(/\s+/g, '_').toLowerCase()}_hospital_${hospitalId}`

          const lastTs = (() => {
            try {
              const t = req?.sentToPatientHospitalAt || req?.matchedAt || req?.updatedAt || req?.createdAt
              return t ? new Date(t).getTime() : 0
            } catch (e) {
              return 0
            }
          })()

          const existing = syntheticRoomsMap.get(counterpartId || counterpartName.toLowerCase()) || {
            roomId,
            title: counterpartName || 'Matched Hospital',
            subtitle: 'Hospital-to-Hospital Chat',
            lastMessage: { content: req?.message || 'Matched donor details sent' },
            unreadCount: 0,
            lastMessageTime: req?.sentToPatientHospitalAt || req?.matchedAt || req?.createdAt || null,
          }

          if (lastTs >= getTimestamp(existing)) {
            existing.roomId = roomId
            existing.title = counterpartName || existing.title
            existing.subtitle = req?.patientName || req?.patientHospitalName || 'Hospital-to-Hospital Chat'
            existing.lastMessage = { content: req?.message || existing.lastMessage?.content || 'Matched donor details sent' }
            existing.lastMessageTime = req?.sentToPatientHospitalAt || req?.matchedAt || req?.createdAt || null
          }

          syntheticRoomsMap.set(counterpartId || counterpartName.toLowerCase(), existing)
        }

        setHospitalChatRooms(Array.from(syntheticRoomsMap.values()))
      } catch (err) {
        console.error('Failed to fetch hospital profile/chats', err)
      }
    }

    loadHospitalProfileAndChats()
  }, [])

  const groupedRooms = useMemo(() => {
    const grouped = {
      registeredPatients: [],
      organRequests: [],
      hospitalChats: [],
      acceptedDonors: [],
    }

    const sortedRooms = [...rooms].sort((a, b) => getTimestamp(b) - getTimestamp(a))
    for (const room of sortedRooms) {
      const category = getRoomCategory(room)
      grouped[category].push(room)
    }
    grouped.hospitalChats = [...hospitalChatRooms].sort((a, b) => getTimestamp(b) - getTimestamp(a))
    return grouped
  }, [rooms, hospitalChatRooms])

  const activeRoom = useMemo(
    () => [...rooms, ...hospitalChatRooms].find((room) => String(room.roomId) === String(state.activeRoomId)),
    [rooms, hospitalChatRooms, state.activeRoomId]
  )

  const activeRoomCategory = useMemo(() => getRoomCategory(activeRoom), [activeRoom])

  useEffect(() => {
    if (!activeRoomCategory) return
    setOpenSections((prev) => (prev[activeRoomCategory] ? prev : { ...prev, [activeRoomCategory]: true }))
  }, [activeRoomCategory])

  const handleSelectEnhanced = async (roomId) => {
      const res = await joinRoom(roomId)
      let msgs = []
      if (res && res.success) {
        msgs = await loadHistory(roomId) || []
      } else {
      msgs = await loadHistory(roomId) || []
    }
    try {
      const myId = String((localStorage.getItem('userId')) || '')
      const unreadIds = (msgs || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
      if (unreadIds.length > 0) {
        markRead(roomId, unreadIds)
        setTimeout(() => loadRooms(), 300)
      }
    } catch (e) {}
  }

  const renderRoomItem = (room) => {
    const isHospitalUser = String(user?.role || '').toLowerCase() === 'hospital'
    const category = getRoomCategory(room)
    const isActive = String(state.activeRoomId) === String(room.roomId)
    const roomId = String(room?.roomId || '')
    const patientIdMatch = roomId.match(/(?:_|^)patient_([0-9a-fA-F]{24})(?:_|$)/)
    const patientName = patientIdMatch ? hospitalPatientNames[patientIdMatch[1]] : ''
    const primary = category === 'registeredPatients'
      ? (patientName || room.subtitle || room.title || room.roomId || 'Conversation')
      : getDisplayPrimary(room, isHospitalUser)
    const secondary = category === 'registeredPatients'
      ? (room.title || '')
      : getDisplaySecondary(room, isHospitalUser)
    const lastMessage = String(room?.lastMessage?.content || '').trim()
    const unread = typeof room?.aggUnread === 'number' ? room.aggUnread : (typeof room?.unreadCount === 'number' ? room.unreadCount : 0)

    return (
      <button
        key={room.roomId}
        type="button"
        onClick={() => handleSelectEnhanced(room.roomId)}
        className={`w-full text-left px-4 py-3 transition-colors ${
          isActive ? 'bg-destructive/10' : 'hover:bg-destructive/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {roomId.includes('_donor_') ? (
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : roomId.includes('_hospital_') && /room_hospital_[^_]+_hospital_[^_]+/i.test(roomId) ? (
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 21V9h10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{primary}</div>
                {secondary ? <div className="text-xs text-muted-foreground truncate">{secondary}</div> : null}
              </div>
              {unread > 0 ? (
                <div className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full shrink-0">
                  {unread}
                </div>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground mt-1 truncate">
              {lastMessage || 'No messages yet'}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex h-[calc(100vh-160px)] gap-4">
      <aside className="w-[390px] shrink-0 rounded-3xl border bg-background/80 overflow-hidden flex flex-col">
        <div className="p-5 border-b">
          <div className="text-2xl font-semibold">Active Chats</div>
          <div className="text-sm text-muted-foreground mt-1">
            Conversations grouped by the way the hospital is involved.
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-3">
          {SECTION_ORDER.map((key) => {
            const meta = SECTION_META[key]
            const sectionRooms = groupedRooms[key] || []
            const isOpen = !!openSections[key]

            return (
              <section key={key} className="rounded-2xl border bg-white overflow-hidden">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left flex items-start justify-between gap-4 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))}
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="font-semibold">{meta.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{meta.description}</div>
                  </div>
                  <div className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full shrink-0">
                    {sectionRooms.length}
                  </div>
                </button>

                {isOpen ? (
                  sectionRooms.length > 0 ? (
                    <div className="divide-y">
                      {sectionRooms.map(renderRoomItem)}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground">
                      No conversations in this section yet.
                    </div>
                  )
                ) : null}
              </section>
            )
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 rounded-3xl border bg-background/80 overflow-hidden">
        {(() => {
          const selected = activeRoom
          let chatProp = { ...state, title: selected?.title, subtitle: selected?.subtitle }
          if (activeRoomCategory === 'registeredPatients') {
            const roomId = String(selected?.roomId || '')
            const patientIdMatch = roomId.match(/(?:_|^)patient_([0-9a-fA-F]{24})(?:_|$)/)
            const patientName = patientIdMatch ? hospitalPatientNames[patientIdMatch[1]] : ''
            chatProp = {
              ...state,
              title: patientName || selected?.subtitle || selected?.title || 'Patient',
              subtitle: selected?.title || 'Registered Patient',
            }
          } else if (user && String(user.role).toLowerCase() === 'hospital') {
            chatProp = { ...state, title: selected?.subtitle || selected?.title, subtitle: selected?.title || selected?.subtitle }
          }
          return <ChatWindow roomId={state.activeRoomId} chat={chatProp} onSend={sendMessage} />
        })()}
      </div>
    </div>
  )
}
