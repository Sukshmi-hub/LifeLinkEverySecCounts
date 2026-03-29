import React from 'react'
import { useAuth } from '@/context/AuthContext'

export default function ChatList({ rooms = [], activeRoomId, onSelect, messages = [], heading = 'Active Chats' }) {
  const { user } = useAuth() || {}

  const getMyId = () => String(user?.id || user?._id || '')

  const isMineMessage = (m) => {
    try {
      if (!m) return false
      const myId = getMyId()
      if (m.senderId && String(m.senderId) === myId) return true
      if (m.sender && (String(m.sender._id || '') === myId || String(m.sender.id || '') === myId)) return true
      if (m.senderRole && user?.role && String(m.senderRole).toLowerCase() === String(user.role).toLowerCase()) return true
      return false
    } catch (e) {
      return false
    }
  }
  return (
    <div className="w-64 border-r p-4 overflow-auto">
      <h4 className="text-xl font-semibold mb-2">{heading}</h4>
      {rooms.length === 0 && <div className="text-sm text-muted-foreground">No conversations</div>}
      <ul>
        {(() => {
          // Deduplicate rooms by displayed name (title/subtitle).
          // Keep the most-recent room (by lastMessage timestamp) and merge unread counts.
          const map = new Map()
          for (const r of rooms) {
            // Prefer stable ids parsed from roomId for deduplication: donorId > patientId > hospitalId
            let k = ''
            try {
              const rid = String(r.roomId || '')
              const donorMatch = rid.match(/(?:_|^)donor_([0-9a-fA-F]{6,24})(?:_|$)/)
              const patientMatch = rid.match(/(?:_|^)patient_([0-9a-fA-F]{6,24})(?:_|$)/)
              const hospitalMatch = rid.match(/(?:_|^)hospital_([0-9a-fA-F]{6,24})(?:_|$)/)
              if (donorMatch) k = `donor:${donorMatch[1]}`
              else if (patientMatch) k = `patient:${patientMatch[1]}`
              else if (hospitalMatch) k = `hospital:${hospitalMatch[1]}`
            } catch (e) {
              // ignore
            }

            if (!k) {
              const key = (user?.role === 'hospital' || user?.role === 'ngo') ? (r.subtitle || r.title || r.roomId) : (r.title || r.roomId)
              k = String(key || '').trim().toLowerCase()
            }
            if (!k) continue

            const lastTs = (() => {
              try {
                const t = r.lastMessage && (r.lastMessage.timestamp || r.lastMessage.createdAt) ? (r.lastMessage.timestamp || r.lastMessage.createdAt) : (r.lastMessageTime || r.updatedAt || r.createdAt)
                return t ? new Date(t).getTime() : 0
              } catch (e) { return 0 }
            })()

            const unreadCount = typeof r.unreadCount === 'number' ? r.unreadCount : 0

            if (!map.has(k)) {
              map.set(k, { room: r, lastTs, aggUnread: unreadCount })
            } else {
              const existing = map.get(k)
              // sum unread counts
              const totalUnread = (existing.aggUnread || 0) + unreadCount
              // prefer the room with newer lastTs
              if (lastTs > (existing.lastTs || 0)) {
                map.set(k, { room: r, lastTs, aggUnread: totalUnread })
              } else {
                existing.aggUnread = totalUnread
                map.set(k, existing)
              }
            }
          }

          const deduped = Array.from(map.values()).map(v => ({ ...v.room, aggUnread: v.aggUnread }))
          // DEBUG: log dedupe mapping to help diagnose duplicates (remove after debugging)
          try {
            // eslint-disable-next-line no-console
            console.log('ChatList deduped rooms:', deduped.map(r => ({ roomId: r.roomId, title: r.title, subtitle: r.subtitle, aggUnread: r.aggUnread })))
          } catch (e) {}
          // sort by most recent conversation first
          deduped.sort((a, b) => {
            const ta = a.lastMessage && (a.lastMessage.timestamp || a.lastMessage.createdAt) ? new Date(a.lastMessage.timestamp || a.lastMessage.createdAt).getTime() : 0
            const tb = b.lastMessage && (b.lastMessage.timestamp || b.lastMessage.createdAt) ? new Date(b.lastMessage.timestamp || b.lastMessage.createdAt).getTime() : 0
            return tb - ta
          })

          // Render deduped list but ensure unique displayed names (keep first/most-recent)
          const elements = []
          const seenNames = new Set()
          for (const r of deduped) {
            const displayName = (user?.role === 'hospital' || user?.role === 'ngo') ? (r.subtitle || r.title || r.roomId) : (r.title || r.roomId)
            const nameKey = String(displayName || '').trim().toLowerCase()
            if (nameKey && seenNames.has(nameKey)) continue
            if (nameKey) seenNames.add(nameKey)

            elements.push(
              <li key={r.roomId} className={`p-3 border-b cursor-pointer transition-colors ${activeRoomId === r.roomId ? 'bg-destructive/10' : 'hover:bg-destructive/5'}`} onClick={() => onSelect(r.roomId)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {user?.role === 'hospital' ? (
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : ((r.title || '').toLowerCase().includes('hospital') || (r.title || '').toLowerCase().includes('clinic')) ? (
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 21V9h10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    ) : (
                      <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{displayName}</div>
                    {(user?.role === 'hospital' || user?.role === 'ngo') ? (
                      <div className="text-xs text-muted-foreground truncate">{r.title || ''}</div>
                    ) : (
                      r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                    <div className="text-sm text-muted-foreground mt-1 truncate">{r.lastMessage?.content?.slice(0,60) || ''}</div>
                  </div>
                  {(() => {
                    const unreadFromProp = typeof r.aggUnread === 'number' ? r.aggUnread : (typeof r.unreadCount === 'number' ? r.unreadCount : null)
                    const computedUnread = messages ? messages.filter(m => m && String(m.roomId) === String(r.roomId) && !m.isRead && !isMineMessage(m)).length : 0
                    const unread = unreadFromProp !== null ? unreadFromProp : computedUnread
                    return unread > 0 ? <div className="text-xs bg-destructive text-destructive-foreground px-2 rounded-full">{unread}</div> : null
                  })()}
                </div>
              </li>
            )
          }

          return elements
        })()}
      </ul>
    </div>
  )
}
