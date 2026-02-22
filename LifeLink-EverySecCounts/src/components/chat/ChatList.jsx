import React from 'react'
import { useAuth } from '@/context/AuthContext'

export default function ChatList({ rooms = [], activeRoomId, onSelect, messages = [] }) {
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
    <div className="w-64 border-r p-4 overflow-auto h-full">
      <h4 className="font-semibold mb-2">Active Chats</h4>
      {rooms.length === 0 && <div className="text-sm text-muted-foreground">No conversations</div>}
      <ul>
        {rooms.map(r => (
          <li key={r.roomId} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${activeRoomId === r.roomId ? 'bg-gray-100' : ''}`} onClick={() => onSelect(r.roomId)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {/* show person icon for hospital users (they chat with patients) */}
                {user?.role === 'hospital' ? (
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : ((r.title || '').toLowerCase().includes('hospital') || (r.title || '').toLowerCase().includes('clinic')) ? (
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 21V9h10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                ) : (
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* For hospital users show patient name as primary */}
                <div className="font-medium truncate">{user?.role === 'hospital' ? (r.subtitle || r.title || r.roomId) : (r.title || r.roomId)}</div>
                {user?.role === 'hospital' ? (
                  <div className="text-xs text-muted-foreground truncate">{r.title || ''}</div>
                ) : (
                  r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                )}
                <div className="text-sm text-muted-foreground mt-1 truncate">{r.lastMessage?.content?.slice(0,60) || ''}</div>
              </div>
              {(() => {
                const unreadFromProp = typeof r.unreadCount === 'number' ? r.unreadCount : null
                const computedUnread = messages ? messages.filter(m => m && String(m.roomId) === String(r.roomId) && !m.isRead && !isMineMessage(m)).length : 0
                const unread = unreadFromProp !== null ? unreadFromProp : computedUnread
                return unread > 0 ? <div className="text-xs bg-red-600 text-white px-2 rounded-full">{unread}</div> : null
              })()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
