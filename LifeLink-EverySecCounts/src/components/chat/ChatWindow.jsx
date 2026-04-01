import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Send } from 'lucide-react'

export default function ChatWindow({ roomId, chat = { messages: [] }, onSend }) {
  const { user } = useAuth() || {}
  const [text, setText] = useState('')
  const bottomRef = useRef()

  useEffect(() => {
    try {
      if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    } catch (e) {
      // ignore
    }
  }, [chat.messages])

  const getMyId = () => String(user?.id || user?._id || '')

  const isMine = (m) => {
    try {
      if (!m) return false
      const myId = getMyId()
      // If message has senderId (ObjectId or string) compare
      if (m.senderId) {
        if (String(m.senderId) === myId) return true
        // sometimes senderId may be nested under sender._id
        if (m.sender && (String(m.sender._id || '') === myId || String(m.sender.id || '') === myId)) return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  const handleSend = async (value) => {
    const body = String(value || '').trim()
    if (!body || !roomId) return
    try {
      await onSend(roomId, body)
    } catch (err) {
      console.error('send failed', err)
    }
  }

  if (!roomId) return <div className="flex-1 p-6">Select a conversation</div>

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-160px)]">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {user?.role === 'hospital' ? (
              // person icon when hospital user views (show patient)
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              // building icon for patient viewing hospital/ngo
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 21V9h10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M10 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            )}
          </div>
          <div>
            <div className="font-semibold">
              {user?.role === 'hospital'
                ? (chat?.title || chat?.subtitle || 'Conversation')
                : (user?.role === 'ngo'
                  ? (chat?.subtitle || chat?.title || 'Conversation')
                  : (chat?.title || 'Conversation'))}
            </div>
            <div className="text-xs text-muted-foreground">
              {user?.role === 'hospital'
                ? (chat?.subtitle || 'Patient')
                : (user?.role === 'ngo' ? (chat?.title || 'Hospital / NGO') : 'Hospital / NGO')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          {(chat.messages || []).map((m) => (
            <div key={m._id || m.id || Math.random()} className={`mb-4 flex ${isMine(m) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isMine(m) ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                <div className="text-sm mb-1">{m.content}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-white">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            className="flex-1 rounded-full bg-white px-4 py-3 h-11 placeholder:text-muted-foreground outline-none border-2 border-destructive/60"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const t = text.trim()
                if (!t) return
                await handleSend(t)
                setText('')
              }
            }}
          />
          <button
            className="ml-3 flex items-center gap-2 bg-destructive text-white px-4 py-2 rounded-md shadow-sm"
            onClick={async () => {
              const t = text.trim()
              if (!t) return
              await handleSend(t)
              setText('')
            }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
