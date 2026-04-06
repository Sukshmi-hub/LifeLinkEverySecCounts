import React, { useEffect, useMemo, useRef, useState } from 'react'
import { serverUrl } from '@/lib/serverConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Trash2, Loader2, ShieldAlert, FileText, AlertTriangle, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const starterMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Hi, I am your health assistant. Ask a general health question and I will explain it in simple language. I cannot diagnose or prescribe medicine.',
    createdAt: new Date().toISOString(),
  },
]

const quickQuestions = [
  'Explain my report',
  'Is my condition serious?',
  'What should I do?',
  'Diet suggestions',
]

const normalizeMessages = (messages = []) => messages
  .filter((m) => m && m.content)
  .map((m, idx) => ({
    id: String(m.id || m._id || `${m.role || 'msg'}-${idx}`),
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  createdAt: m.createdAt || new Date().toISOString(),
}))

const parseReportSummary = (text = '') => {
  const raw = String(text || '')
  const readValue = (regex) => {
    const match = raw.match(regex)
    if (!match) return null
    const val = Number(String(match[1]).replace(/,/g, ''))
    return Number.isFinite(val) ? val : null
  }

  const hemoglobin = readValue(/(?:hemoglobin|hb)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const wbc = readValue(/(?:wbc|white blood cell count)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const platelets = readValue(/(?:platelets?|plt)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i)

  const flags = []
  if (hemoglobin != null && hemoglobin < 9) flags.push({ label: `Hemoglobin ${hemoglobin} is low`, level: 'low' })
  if (platelets != null && platelets < 50000) flags.push({ label: `Platelets ${platelets} are critically low`, level: 'critical' })
  if (wbc != null && wbc > 11000) flags.push({ label: `WBC ${wbc} is high`, level: 'high' })

  const severity = flags.some(f => f.level === 'critical') ? 'Critical'
    : flags.some(f => f.level === 'high') ? 'High'
    : flags.some(f => f.level === 'low') ? 'Low'
    : 'Normal'

  return {
    values: { hemoglobin, wbc, platelets },
    severity,
    flags,
    summary: flags.length ? flags.map(f => f.label).join('; ') : 'No obvious high-risk pattern detected',
  }
}

const buildLocalMedicalReply = (message, severity) => {
  const text = String(message || '').toLowerCase()

  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|one side|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return 'This could be urgent. Please seek emergency medical care now or call local emergency services.'
  }

  if (/hemoglobin|hb|anemia|anaemia/i.test(text) || severity?.severity === 'Low' || severity?.severity === 'High' || severity?.severity === 'Critical') {
    const parts = []
    if (severity?.severity === 'Low') {
      parts.push('Your hemoglobin looks low, so you may have anemia or another cause of low blood count.')
    } else if (severity?.severity === 'High' || severity?.severity === 'Critical') {
      parts.push('Your report has an abnormal pattern that should be reviewed by a doctor.')
    } else {
      parts.push('Low hemoglobin can mean your blood may carry less oxygen than normal.')
    }
    parts.push('Common causes include iron deficiency, vitamin deficiencies, blood loss, or some chronic illnesses.')
    parts.push('A doctor may suggest tests and treatment based on the cause.')
    parts.push('If you feel very weak, dizzy, short of breath, or have chest pain, please see a doctor promptly.')
    return parts.join(' ')
  }

  if (/before surgery|surgery prep|pre[- ]?op|operation/i.test(text)) {
    return 'Before surgery, follow your doctor or hospital instructions carefully. Common steps may include fasting, telling the doctor about medicines, allergies, and past illnesses, and arranging transportation and support after the procedure.'
  }

  if (/anemia|anaemia/i.test(text)) {
    return 'Common symptoms of anemia include tiredness, weakness, dizziness, pale skin, shortness of breath, and fast heartbeat. The exact cause matters, so a doctor may recommend blood tests and treatment.'
  }

  return 'I can explain general health topics in simple terms, but I cannot diagnose or prescribe treatment. For serious symptoms, worsening problems, or anything urgent, please consult a doctor.'
}

const summarizeOCRText = (text = '') => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return clean.slice(0, 5000)
}

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]" />
    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]" />
    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
  </div>
)

const HealthChatAssistant = () => {
  const [messages, setMessages] = useState(starterMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [sessionId, setSessionId] = useState(null)
  const [patientInfo, setPatientInfo] = useState({ age: '', gender: '', bloodGroup: '' })
  const [reportData, setReportData] = useState('')
  const [reportFileName, setReportFileName] = useState('')
  const [reportOCRStatus, setReportOCRStatus] = useState('idle')
  const [reportUploadError, setReportUploadError] = useState('')
  const [reportMeta, setReportMeta] = useState({ values: { hemoglobin: null, wbc: null, platelets: null }, severity: 'Normal', flags: [], summary: 'No report data provided' })
  const bottomRef = useRef(null)
  const messageListRef = useRef(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${serverUrl}/api/patient/me`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.success && json.data) {
          setPatientInfo({
            age: json.data.age ?? '',
            gender: json.data.gender ?? '',
            bloodGroup: json.data.bloodGroup ?? json.data.blood_type ?? '',
          })
        }
      } catch (err) {
        // keep defaults
      }
    }

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
        // keep starter message
      } finally {
        setHydrating(false)
      }
    }

    loadProfile()
    loadHistory()
  }, [])

  useEffect(() => {
    const scrollToBottom = () => {
      const container = messageListRef.current
      if (!container) return
      container.scrollTop = container.scrollHeight
    }

    const raf = window.requestAnimationFrame(scrollToBottom)
    return () => window.cancelAnimationFrame(raf)
  }, [messages, loading])

  const canSend = useMemo(() => Boolean(input.trim()), [input])

  useEffect(() => {
    setReportMeta(parseReportSummary(reportData))
  }, [reportData])

  const handleReportUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setReportFileName(file.name)
    setReportOCRStatus('uploading')
    setReportUploadError('')

    try {
      const token = localStorage.getItem('token')
      const endpoint = `${serverUrl}/api/documents/validate-medical-report`
      const formData = new FormData()
      formData.append('document', file)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })

      const json = await res.json().catch(() => ({}))
      console.log('[HealthChat] medical report OCR response', json)

      if (!json?.extractedText && !json?.extractedTextPreview) {
        throw new Error(json?.message || 'OCR did not return readable text')
      }

      const extracted = summarizeOCRText(json.extractedText || json.extractedTextPreview)
      setReportData(extracted)
      setReportOCRStatus(json.isValid ? 'valid' : 'review')
      toast.success(json.isValid ? 'Report text detected and added to context' : 'Text extracted from report. Review the summary before sending.')
    } catch (error) {
      console.error('[HealthChat] report OCR failed', error)
      setReportOCRStatus('error')
      setReportUploadError(error?.message || 'Could not read the uploaded report')
      toast.error(error?.message || 'Could not read the uploaded report')
    } finally {
      event.target.value = ''
    }
  }

  const appendSuggestion = (text) => {
    setInput(text)
    window.requestAnimationFrame(() => {
      submitMessage(text)
    })
  }

  const submitMessage = async (text) => {
    const messageText = String(text || input).trim()
    if (!messageText) return

    const userMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    }
    const localReply = {
      id: `assistant-local-${Date.now()}`,
      role: 'assistant',
      content: buildLocalMedicalReply(messageText, reportMeta),
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage, localReply])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const endpoint = `${serverUrl}/api/health-chat/chat`
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)
      console.log('[HealthChat] sending request', {
        endpoint,
        messageText,
        patientInfo,
        reportDataLength: String(reportData || '').length,
        chatHistoryLength: messages.slice(-12).length,
        hasToken: Boolean(token),
      })

      let res
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            message: messageText,
            sessionId,
            patientInfo,
            reportData,
            chatHistory: messages.slice(-12),
          }),
          signal: controller.signal,
        })
      } finally {
        window.clearTimeout(timeout)
      }

      console.log('[HealthChat] received response', {
        status: res.status,
        ok: res.ok,
        url: endpoint,
      })

      const rawText = await res.text()
      console.log('[HealthChat] raw response body', rawText)
      let json = {}
      try {
        json = rawText ? JSON.parse(rawText) : {}
      } catch (parseErr) {
        console.error('[HealthChat] failed to parse JSON', parseErr)
        throw new Error(`Server returned non-JSON response: ${rawText.slice(0, 200)}`)
      }

      console.log('[HealthChat] parsed response body', json)
      if (!json.success) {
        throw new Error(json.message || `Request failed with status ${res.status}`)
      }

      setSessionId(json.sessionId || sessionId)
      const history = normalizeMessages(json.messages)
      setMessages(history.length ? history : [
        userMessage,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: json.reply || localReply.content,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (err) {
      console.error('[HealthChat] send failed', err)
      setMessages((prev) => {
        const next = [...prev]
        const lastAssistantIndex = [...next].reverse().findIndex((m) => m.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          const index = next.length - 1 - lastAssistantIndex
          next[index] = {
            ...next[index],
            content: buildLocalMedicalReply(messageText, reportMeta),
          }
          return next
        }
        return [...next, {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          content: buildLocalMedicalReply(messageText, reportMeta),
          createdAt: new Date().toISOString(),
        }]
      })
      toast.error(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${serverUrl}/api/health-chat/history`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      })
    } catch (err) {
      // ignore
    }
    setSessionId(null)
    setMessages(starterMessages)
    setInput('')
    toast.success('Conversation cleared')
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 via-white to-rose-50">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Health Assistant</h1>
                  <p className="text-sm text-muted-foreground">Simple answers for general health questions.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Not for diagnosis
                </Badge>
                <Badge variant="outline">Consult a doctor for serious symptoms</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={clearHistory} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => q === 'Explain my report' ? appendSuggestion('Can you explain my report in simple language?') : q === 'Is my condition serious?' ? appendSuggestion('Based on my report, is my condition serious?') : q === 'What should I do?' ? appendSuggestion('What should I do next based on my report?') : appendSuggestion('Give me diet suggestions for my condition.')}
                disabled={loading}
                className="text-left rounded-xl border border-border bg-white/80 px-4 py-3 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm h-full">
          <CardContent className="p-4 md:p-5 h-full flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Medical Context</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Age</label>
                <Input
                  value={patientInfo.age}
                  onChange={(e) => setPatientInfo((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="Age"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Gender</label>
                <Input
                  value={patientInfo.gender}
                  onChange={(e) => setPatientInfo((prev) => ({ ...prev, gender: e.target.value }))}
                  placeholder="Gender"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Blood Group</label>
                <Input
                  value={patientInfo.bloodGroup}
                  onChange={(e) => setPatientInfo((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                  placeholder="e.g. O+"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Upload Report for Auto OCR</label>
              <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">PDF, JPG, or PNG report</p>
                      <p className="text-xs text-muted-foreground">We will extract the text automatically and fill the context box.</p>
                    </div>
                  </div>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleReportUpload} className="cursor-pointer" />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {reportOCRStatus === 'uploading' && (
                      <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Reading report...</Badge>
                    )}
                    {reportOCRStatus === 'valid' && (
                      <Badge variant="outline" className="gap-1 text-green-700"><CheckCircle2 className="w-3 h-3" />Report text detected</Badge>
                    )}
                    {reportOCRStatus === 'review' && (
                      <Badge variant="outline" className="gap-1"><AlertTriangle className="w-3 h-3" />Text extracted</Badge>
                    )}
                    {reportOCRStatus === 'error' && (
                      <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />OCR failed</Badge>
                    )}
                    {reportFileName ? <span className="text-muted-foreground truncate">{reportFileName}</span> : null}
                  </div>
                  {reportUploadError ? (
                    <p className="text-xs text-destructive">{reportUploadError}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Report Data or OCR Summary</label>
              <Textarea
                value={reportData}
                onChange={(e) => setReportData(e.target.value)}
                placeholder={`Paste key report values here, for example:\nHemoglobin: 8.5\nWBC: 12000\nPlatelets: 200000`}
                className="min-h-[260px] h-full resize-none rounded-2xl border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={reportMeta.severity === 'Critical' ? 'destructive' : reportMeta.severity === 'High' ? 'secondary' : 'outline'}>Severity: {reportMeta.severity}</Badge>
              {reportMeta.flags.length > 0 ? (
                reportMeta.flags.map((flag) => (
                  <Badge key={flag.label} variant="outline" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {flag.label}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">No obvious high-risk values</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm h-full flex flex-col min-h-0">
          <CardContent className="p-0 h-full flex flex-col min-h-0">
            <div ref={messageListRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
              {hydrating ? (
                <div className="flex justify-center py-10 text-sm text-muted-foreground">Loading your conversation...</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'assistant'
                          ? 'bg-muted text-foreground rounded-bl-md'
                          : 'bg-primary text-primary-foreground rounded-br-md'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted text-foreground shadow-sm rounded-bl-md">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} className="h-px w-full" />
            </div>

            <div className="border-t bg-white p-4 md:p-5">
              <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about symptoms, lab values, surgery prep, medications, or general health guidance..."
                    className="min-h-[96px] resize-none rounded-2xl border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submitMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={() => submitMessage()}
                    disabled={!canSend}
                    type="button"
                    className="md:h-auto md:min-h-[96px] md:px-6 gap-2 rounded-2xl"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This assistant provides general information only. For emergencies or worsening symptoms, contact a doctor or emergency services immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HealthChatAssistant
