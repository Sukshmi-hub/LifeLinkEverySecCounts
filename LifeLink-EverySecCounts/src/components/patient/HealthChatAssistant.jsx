import React, { useEffect, useMemo, useRef, useState } from 'react'
import { serverUrl } from '@/lib/serverConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const starterMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Hi, I am your health assistant. Ask any health-related question and I will answer in simple language.',
    createdAt: new Date().toISOString(),
  },
]

const normalizeMessages = (messages = []) => messages
  .filter((m) => m && m.content)
  .map((m, idx) => ({
    id: String(m.id || m._id || `${m.role || 'msg'}-${idx}`),
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
    createdAt: m.createdAt || new Date().toISOString(),
  }))

const buildLocalMedicalReply = (message) => {
  const text = String(message || '').toLowerCase()
  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return 'This could be urgent. Please seek emergency medical care now or call local emergency services.'
  }
  if (/hemoglobin|hb|anemia|anaemia/i.test(text)) {
    return 'Low hemoglobin can mean your blood may carry less oxygen than normal. A doctor may suggest tests and treatment based on the cause.'
  }
  if (/before surgery|surgery prep|pre[- ]?op|operation/i.test(text)) {
    return 'Before surgery, follow your doctor or hospital instructions carefully. Common steps may include fasting and telling the doctor about medicines, allergies, and past illnesses.'
  }
  if (/anemia|anaemia/i.test(text)) {
    return 'Common symptoms of anemia include tiredness, weakness, dizziness, pale skin, shortness of breath, and fast heartbeat.'
  }
  return 'I can explain general health topics in simple terms, but I cannot diagnose or prescribe treatment. For serious symptoms or anything urgent, please consult a doctor.'
}

const HealthChatAssistant = () => {
  const [messages, setMessages] = useState(starterMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [sessionId, setSessionId] = useState(null)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/health-chat/history`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.success) {
          setSessionId(json.sessionId || null)
          const history = normalizeMessages(json.messages)
          setMessages(history.length ? history : starterMessages)
        }
      } catch (err) {
        console.error('[HealthChat] history load failed', err)
      } finally {
        setHydrating(false)
      }
    }

    loadHistory()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const canSend = useMemo(() => Boolean(input.trim()) && !loading, [input, loading])

  const submitMessage = async () => {
    const messageText = input.trim()
    if (!messageText || loading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    }
    const optimisticReply = {
      id: `assistant-local-${Date.now()}`,
      role: 'assistant',
      content: buildLocalMedicalReply(messageText),
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage, optimisticReply])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${serverUrl}/api/health-chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: messageText }),
      })

      const raw = await res.text()
      let json = {}
      try {
        json = raw ? JSON.parse(raw) : {}
      } catch (parseError) {
        throw new Error(`Server returned non-JSON response: ${raw.slice(0, 160)}`)
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || `Request failed with status ${res.status}`)
      }

      setSessionId(json.sessionId || null)
      setMessages((prev) => {
        const next = [...prev]
        const lastAssistantIndex = [...next].reverse().findIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          const index = next.length - 1 - lastAssistantIndex
          next[index] = {
            ...next[index],
            content: json.reply || optimisticReply.content,
          }
        }
        return normalizeMessages(next)
      })
    } catch (err) {
      console.error('[HealthChat] send failed', err)
      setMessages((prev) => {
        const next = [...prev]
        const lastAssistantIndex = [...next].reverse().findIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          const index = next.length - 1 - lastAssistantIndex
          next[index] = {
            ...next[index],
            content: 'Something went wrong. Try again.',
          }
          return next
        }
        return [...next, {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Try again.',
          createdAt: new Date().toISOString(),
        }]
      })
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${serverUrl}/api/health-chat/history`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch (err) {
      console.error('[HealthChat] clear failed', err)
    }
    setSessionId(null)
    setMessages(starterMessages)
    setInput('')
    toast.success('Conversation cleared')
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 via-white to-rose-50">
        <CardContent className="p-5 md:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Health Assistant</h1>
              <p className="text-sm text-muted-foreground">Simple answers for health questions. Manual chat only.</p>
            </div>
          </div>

          <Button variant="outline" onClick={clearHistory} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 border shadow-sm">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div
            ref={chatContainerRef}
            className="chat-container flex-1 min-h-[400px] overflow-y-auto flex flex-col gap-4 p-4 md:p-6"
            style={{ height: '400px' }}
          >
            {hydrating ? (
              <div className="flex justify-center py-10 text-sm text-muted-foreground">Loading your conversation...</div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap ${
                      message.role === 'assistant'
                        ? 'bg-muted text-foreground rounded-bl-md'
                        : 'bg-primary text-primary-foreground rounded-br-md'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted text-foreground shadow-sm rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Typing...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t bg-white p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any health-related question..."
                className="min-h-[96px] resize-none rounded-2xl border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitMessage()
                  }
                }}
              />
              <Button
                onClick={submitMessage}
                disabled={!canSend}
                type="button"
                className="md:h-auto md:min-h-[96px] md:px-6 gap-2 rounded-2xl"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HealthChatAssistant
