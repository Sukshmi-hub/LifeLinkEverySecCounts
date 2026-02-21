import React, { useEffect, useState, useRef } from 'react'

export default function ChatWindow({ roomId, chat, onSend, onMarkRead }) {
  const [text, setText] = useState('')
  const bottomRef = useRef()

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  if (!roomId) return <div className="flex-1 p-4">Select a conversation</div>

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b">Room: {roomId}</div>
      <div className="flex-1 overflow-auto p-4">
        {chat.messages.map(m => (
          <div key={m._id} className="mb-2">
            <div className="text-sm font-semibold">{m.senderRole}</div>
            <div className="p-2 bg-gray-100 rounded">{m.content}</div>
            <div className="text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleString()}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex items-center gap-2">
        <input className="flex-1 border rounded p-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
        <button className="btn btn-primary" onClick={async () => { if (text.trim()) { await onSend(roomId, text.trim()); setText('') } }}>Send</button>
      </div>
    </div>
  )
}
