import React from 'react'

export default function ChatList({ rooms = [], activeRoomId, onSelect }) {
  return (
    <div className="w-64 border-r p-2 overflow-auto">
      <h4 className="font-semibold mb-2">Active Chats</h4>
      {rooms.length === 0 && <div className="text-sm text-muted-foreground">No conversations</div>}
      <ul>
        {rooms.map(r => (
          <li key={r.roomId} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${activeRoomId === r.roomId ? 'bg-gray-100' : ''}`} onClick={() => onSelect(r.roomId)}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{r.title || r.roomId}</div>
                {r.subtitle && <div className="text-xs text-muted-foreground">{r.subtitle}</div>}
                <div className="text-sm text-muted-foreground mt-1">{r.lastMessage?.content?.slice(0,60) || ''}</div>
              </div>
              {r.unreadCount > 0 && <div className="text-xs bg-red-600 text-white px-2 rounded-full">{r.unreadCount}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
