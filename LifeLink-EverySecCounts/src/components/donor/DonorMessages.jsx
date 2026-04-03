import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import useChat from '@/hooks/useChat'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Building2, Search, AlertTriangle } from "lucide-react";
import { serverUrl } from '@/lib/serverConfig';

/**
 * ChatSystem now accepts 'initialContacts' and 'initialMessages' as props.
 * This removes the hardcoded mock data from this file.
 */
function ChatSystem({ className = "" }) {
  const { user } = useAuth();

    const { sendMessage, joinRoom, loadHistory, markRead } = useChat(serverUrl)

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptedHospitalIds, setAcceptedHospitalIds] = useState([]);

  const messagesEndRef = useRef(null);

  // Fetch donor's chat rooms (conversations) on mount
  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('token')
      const profileRes = await fetch(`${serverUrl}/api/profile`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      let acceptedIds = []
      if (profileRes.ok) {
        const profileJson = await profileRes.json().catch(() => ({}))
        const intents = Array.isArray(profileJson?.data?.user?.donationIntents) ? profileJson.data.user.donationIntents : []
        acceptedIds = intents
          .filter((intent) => {
            const status = String(intent?.status || '').toLowerCase()
            return status === 'approved' || status === 'donor matched' || status === 'completed'
          })
          .map((intent) => String(intent?.donorHospitalId || intent?.hospitalId || intent?.hospital || ''))
          .filter(Boolean)
        setAcceptedHospitalIds(acceptedIds)
      }

      const res = await fetch(`${serverUrl}/api/chat/rooms`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      if (!res.ok) return
      const json = await res.json().catch(() => ({}))
      if (json && json.success && Array.isArray(json.data)) {
        const acceptedSet = new Set(acceptedIds)
        const map = new Map()
        for (const r of json.data) {
          const rid = String(r.roomId || '')
          if (!rid.includes('_donor_')) continue
          if (acceptedSet.size > 0) {
            const matchesAcceptedHospital = acceptedIds.some((hid) => hid && rid.includes(`hospital_${hid}_donor_`))
            if (!matchesAcceptedHospital) continue
          }

          let key = null
          try {
            const hospitalMatch = rid.match(/(?:_|^)hospital_([0-9a-fA-F]{6,24})(?:_|$)/)
            if (hospitalMatch) key = `hospital:${hospitalMatch[1]}`
          } catch (e) {}

          const display = (r.title || r.subtitle || r.roomId || '').toString()
          const lastMsg = r.lastMessage && (r.lastMessage.content || r.lastMessage.message) ? (r.lastMessage.content || r.lastMessage.message) : ''
          const lastTs = r.lastMessage && (r.lastMessage.timestamp || r.lastMessage.createdAt) ? new Date(r.lastMessage.timestamp || r.lastMessage.createdAt).getTime() : 0
          const unread = r.unreadCount || 0

          const mapKey = key || display.trim().toLowerCase() || r.roomId
          if (!map.has(mapKey)) {
            map.set(mapKey, { id: r.roomId, name: display, lastMessage: lastMsg, lastTs, unread, subtitle: r.subtitle || '' })
          } else {
            const existing = map.get(mapKey)
            if ((lastTs || 0) > (existing.lastTs || 0)) {
              map.set(mapKey, { id: r.roomId, name: display, lastMessage: lastMsg, lastTs, unread: (existing.unread || 0) + unread, subtitle: r.subtitle || '' })
            } else {
              existing.unread = (existing.unread || 0) + unread
              map.set(mapKey, existing)
            }
          }
        }

        const contacts = Array.from(map.values()).map(c => ({ id: c.id, name: c.name, lastMessage: c.lastMessage, unread: c.unread, subtitle: c.subtitle }))
        contacts.sort((a, b) => (b.lastMessage && a.lastMessage) ? 0 : 0)
        setContacts(contacts)
      }
    } catch (e) {
      console.error('Failed to fetch chat rooms for donor', e)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  // Load messages for the selected contact (room) when it changes
  useEffect(() => {
    if (!selectedContact) return
    ;(async () => {
      try {
        const roomId = selectedContact.id
        // ensure socket joins the same room the hospital uses
        try { await joinRoom(roomId) } catch (e) { /* ignore join errors */ }

        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/chat/history/${encodeURIComponent(roomId)}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        if (json && json.success && Array.isArray(json.data)) {
          // normalize messages for UI
          const msgs = json.data.map(m => ({
            id: String(m._id || m.id || `msg_${Date.now()}`),
            senderId: String(m.senderId || m.sender_id || ''),
            senderRole: (m.senderRole || m.sender_role || '').toString().toLowerCase(),
            content: m.content || m.message || '',
            timestamp: new Date(m.timestamp || m.createdAt || Date.now()).toLocaleString(),
            isEmergency: false,
            _raw: m
          }))
          setMessages(msgs)
          try {
            const myId = String((localStorage.getItem('userId')) || '')
            const unreadIds = (json.data || []).filter(m => m && !m.isRead && String(m.senderId) !== myId).map(m => m._id)
            if (unreadIds.length > 0) markRead(roomId, unreadIds)
            setTimeout(() => loadRooms(), 300)
          } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to fetch room history', e)
      }
    })()
  }, [selectedContact])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    try {
      const roomId = selectedContact.id
      // send via socket so server saves and emits to the room the hospital joined
      const res = await sendMessage(roomId, newMessage)
      if (res && res.success && res.data) {
        const m = res.data
        // append saved message to local UI
        setMessages(prev => [...prev, {
          id: String(m._id || m.id || `msg_${Date.now()}`),
          senderId: String(m.senderId || ''),
          senderRole: (m.senderRole || '').toString().toLowerCase(),
          content: m.content || '',
          timestamp: new Date(m.timestamp || m.createdAt || Date.now()).toLocaleString(),
          isEmergency: false,
        }])
      }
    } catch (e) {
      console.error('Failed to send message', e)
      // optimistic fallback - mark as sent by current user id and role
      setMessages(prev => [...prev, { id: `msg_${Date.now()}`, senderId: String(user?._id || ''), senderRole: 'donor', content: newMessage, timestamp: new Date().toLocaleTimeString(), isEmergency: false }])
    } finally {
      setNewMessage('')
    }
  };

  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] ${className}`}>
      {/* Sidebar: Contacts */}
      <Card className="md:col-span-1 flex flex-col border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-red-500" />
            Hospital Chats
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-slate-50 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="divide-y divide-slate-100">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                  selectedContact?.id === contact.id ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{contact.name}</p>
                    <p className="text-xs text-slate-500 truncate">{contact.lastMessage}</p>
                  </div>
                  {contact.unread > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 w-5 flex items-center justify-center p-0">
                      {contact.unread}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="md:col-span-2 flex flex-col border-none shadow-sm">
        {selectedContact ? (
          <>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedContact.name}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.map((message) => {
                // Determine ownership using both the live auth user and stored session user
                const senderRole = String(message.senderRole || '').toLowerCase()
                const senderName = String(message.senderName || message.sender_name || message.name || '').trim().toLowerCase()
                let candidateIds = new Set([String(user?._id || ''), String(user?.id || '')])
                let candidateRoles = new Set([String(user?.role || '').toLowerCase()])
                let candidateNames = new Set([String(user?.name || user?.fullName || user?.organizationName || '').trim().toLowerCase()])
                try {
                  const stored = JSON.parse(localStorage.getItem('user') || '{}')
                  candidateIds.add(String(stored?._id || ''))
                  candidateIds.add(String(stored?.id || ''))
                  candidateIds.add(String(stored?.userId || ''))
                  candidateRoles.add(String(stored?.role || '').toLowerCase())
                  candidateNames.add(String(stored?.name || stored?.fullName || stored?.organizationName || '').trim().toLowerCase())
                } catch (e) {}
                try {
                  const storedAuth = JSON.parse(localStorage.getItem('lifelink_auth') || '{}')
                  const current = storedAuth?.user || storedAuth
                  candidateIds.add(String(current?._id || ''))
                  candidateIds.add(String(current?.id || ''))
                  candidateIds.add(String(current?.userId || ''))
                  candidateRoles.add(String(current?.role || '').toLowerCase())
                  candidateNames.add(String(current?.name || current?.fullName || current?.organizationName || '').trim().toLowerCase())
                } catch (e) {}
                const senderId = String(message.senderId || '')
                const isMine = candidateIds.has(senderId) || candidateRoles.has(senderRole) || candidateNames.has(senderName)
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        isMine
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-white text-slate-800 shadow-sm border border-slate-100"
                      } ${message.isEmergency ? "ring-2 ring-red-400" : ""}`}
                    >
                      {message.isEmergency && (
                        <div className="flex items-center gap-1 text-[10px] font-bold mb-1 uppercase">
                          <AlertTriangle className="h-3 w-3" /> Emergency
                        </div>
                      )}
                      <p>{message.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? "text-red-100" : "text-slate-400"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-full bg-slate-100 border-none h-10"
                />
                <Button type="submit" size="icon" className="rounded-full bg-red-600 hover:bg-red-700">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Choose a hospital to start talking</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default ChatSystem;

