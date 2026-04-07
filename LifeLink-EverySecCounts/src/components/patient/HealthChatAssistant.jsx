import React, { useEffect, useMemo, useRef, useState } from 'react'
import { serverUrl } from '@/lib/serverConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Trash2, Loader2, ShieldAlert } from 'lucide-react'
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
  { label: 'Explain my report', prompt: 'Can you explain my report in simple language?' },
  { label: 'Is my condition serious?', prompt: 'Based on my report, is my condition serious?' },
  { label: 'What should I do?', prompt: 'What should I do next based on my report?' },
  { label: 'Diet suggestions', prompt: 'Give me diet suggestions for my condition.' },
  { label: 'What does low hemoglobin mean?', prompt: 'What does low hemoglobin mean?' },
  { label: 'What should I do before surgery?', prompt: 'What should I do before surgery?' },
  { label: 'What are symptoms of anemia?', prompt: 'What are symptoms of anemia?' },
  { label: 'When should I see a doctor urgently?', prompt: 'When should I see a doctor urgently?' },
]

const normalizeMessages = (messages = []) => messages
  .filter((m) => m && m.content)
  .map((m, idx) => ({
    id: String(m.id || m._id || `${m.role || 'msg'}-${idx}`),
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
    createdAt: m.createdAt || new Date().toISOString(),
  }))

const classifyQuestionType = (message = '') => {
  const text = String(message || '').toLowerCase().trim()
  if (/diet suggestion|what food|food suggestion|diet/i.test(text)) return 'diet'
  if (/before surgery|surgery prep|pre[- ]?op|operation/i.test(text)) return 'surgery'
  if (/symptom|symptoms of anemia|signs of anemia/i.test(text)) return 'anemia_symptoms'
  if (/what does low hemoglobin mean|low hemoglobin/i.test(text)) return 'hemoglobin_meaning'
  if (/is my condition serious|serious|risk|how bad/i.test(text)) return 'seriousness'
  if (/explain my report|explain report|report/i.test(text)) return 'report'
  if (/what should i do|what do i do|next step|should i do/i.test(text)) return 'action'
  return 'general'
}

const extractKeywordFindings = (text = '') => {
  const raw = String(text || '').toLowerCase()
  const findings = []
  if (/low hemoglobin|low hb|anemia|anaemia/.test(raw)) findings.push({ key: 'hemoglobin', label: 'low hemoglobin' })
  if (/high wbc|wbc high|infection|inflammation/.test(raw)) findings.push({ key: 'wbc', label: 'high WBC' })
  if (/low platelets|platelets low|platelet low|thrombocytopenia/.test(raw)) findings.push({ key: 'platelets', label: 'low platelets' })
  if (/high sugar|high glucose|diabetes|blood sugar high/.test(raw)) findings.push({ key: 'glucose', label: 'high sugar' })
  if (/high bp|high blood pressure|hypertension/.test(raw)) findings.push({ key: 'bp', label: 'high blood pressure' })
  return findings
}

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
  const findings = extractKeywordFindings(raw)

  const flags = []
  if (hemoglobin != null && hemoglobin < 7) flags.push({ label: `Hemoglobin ${hemoglobin} is very low`, level: 'critical' })
  else if (hemoglobin != null && hemoglobin < 12) flags.push({ label: `Hemoglobin ${hemoglobin} is low`, level: 'low' })
  if (platelets != null && platelets < 50000) flags.push({ label: `Platelets ${platelets} are critically low`, level: 'critical' })
  else if (platelets != null && platelets < 150000) flags.push({ label: `Platelets ${platelets} are low`, level: 'low' })
  else if (platelets != null && platelets > 450000) flags.push({ label: `Platelets ${platelets} are high`, level: 'high' })
  if (wbc != null && wbc < 4000) flags.push({ label: `WBC ${wbc} is low`, level: 'low' })
  else if (wbc != null && wbc > 11000) flags.push({ label: `WBC ${wbc} is high`, level: 'high' })

  const severity = flags.some((f) => f.level === 'critical')
    ? 'Critical'
    : flags.some((f) => f.level === 'high')
      ? 'High'
      : flags.some((f) => f.level === 'low')
        ? 'Low'
        : 'Normal'

  return {
    values: { hemoglobin, wbc, platelets },
    severity,
    flags,
    findings,
    summary: flags.length
      ? flags.map((f) => f.label).join('; ')
      : findings.length
        ? findings.map((f) => f.label).join('; ')
        : 'No obvious high-risk values',
  }
}

const buildLocalMedicalReply = (message, severity) => {
  const text = String(message || '').toLowerCase()
  const questionType = classifyQuestionType(message)

  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|one side|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return 'This could be urgent. Please seek emergency medical care now or call local emergency services.'
  }

  if (questionType === 'report') {
    const hb = severity?.values?.hemoglobin
    const wbc = severity?.values?.wbc
    const platelets = severity?.values?.platelets
    const findings = Array.isArray(severity?.findings) ? severity.findings : []
    const parts = []
    if (hb != null) parts.push(`Hemoglobin: ${hb} (${hb < 9 ? 'low' : 'within the usual range'})`)
    if (wbc != null) parts.push(`WBC: ${wbc} (${wbc > 11000 ? 'high' : 'within the usual range'})`)
    if (platelets != null) parts.push(`Platelets: ${platelets} (${platelets < 150000 ? 'low' : 'normal'})`)
    if (findings.length && !parts.length) {
      return withDisclaimer(`Report summary: Based on the wording in the report, there may be ${findings.map((f) => f.label).join(', ')}.`)
    }
    if (!parts.length) {
      return withDisclaimer("I couldn't detect clear medical values. Please enter values like Hemoglobin, WBC, Platelets.")
    }
    return withDisclaimer(`Report summary: ${parts.join('. ')}`)
  }

  if (questionType === 'seriousness') {
    if (severity?.severity === 'Low') {
      return withDisclaimer('Mild: the values do not look highly concerning right now, but low hemoglobin can still be important and should be discussed with a doctor.')
    }
    if (severity?.severity === 'High' || severity?.severity === 'Critical') {
      return withDisclaimer('High or Needs Attention: your report has abnormal values, so please consult a doctor soon.')
    }
    return withDisclaimer('Mild: the values I can see do not look very serious right now, but it is still worth discussing with a doctor if you have symptoms.')
  }

  if (questionType === 'action') {
    return 'What you should do next:\n- Consult a doctor\n- Share the report values\n- Rest and stay hydrated\n- Follow any test or treatment advice from your doctor'
  }

  if (questionType === 'diet') {
    if (severity?.severity === 'Low') {
      return 'Diet suggestions:\n- Spinach and leafy greens\n- Dates and jaggery\n- Beans, lentils, and chickpeas\n- Iron-rich foods with vitamin C like oranges or lemon'
    }
    return 'Diet suggestions:\n- Balanced meals with vegetables, fruits, protein, and enough water\n- Follow your doctor’s advice if you have a specific condition'
  }

  if (questionType === 'hemoglobin_meaning' || (/hemoglobin|hb|anemia|anaemia/i.test(text) && severity?.values?.hemoglobin != null)) {
    const hb = severity?.values?.hemoglobin
    if (hb != null) {
      if (hb < 9) {
        return 'Low hemoglobin means your blood may carry less oxygen than normal. It can happen with iron deficiency, blood loss, or other causes.'
      }
      if (hb < 12) {
        return 'Your hemoglobin is a bit low. It may need attention, but the exact meaning depends on your doctor’s assessment.'
      }
      return 'Your hemoglobin looks within the usual range.'
    }
    return 'Low hemoglobin means your blood may carry less oxygen than normal. A doctor may suggest tests to find the cause.'
  }

  if (questionType === 'surgery') {
    return 'Before surgery, follow your doctor or hospital instructions carefully. Common steps may include fasting, telling the doctor about medicines, allergies, and past illnesses, and arranging transportation and support after the procedure.'
  }

  if (questionType === 'anemia_symptoms') {
    return 'Common symptoms of anemia include:\n- Tiredness\n- Weakness\n- Dizziness\n- Pale skin\n- Shortness of breath\n- Fast heartbeat'
  }

  if (questionType === 'general') {
    if (/fever/.test(text)) {
      return 'Fever usually means the body is fighting an infection or inflammation. Rest, fluids, and watching for worsening symptoms can help. If it is high or lasts long, see a doctor.'
    }
    if (/cold|cough|sore throat|flu/.test(text)) {
      return 'A cold or mild viral illness often gets better with rest and fluids. Warm liquids may help. If breathing becomes difficult or symptoms worsen, consult a doctor.'
    }
    if (/headache/.test(text)) {
      return 'Headaches can happen from stress, dehydration, lack of sleep, or illness. Rest, water, and less screen strain may help. Seek care if it is sudden, severe, or unusual.'
    }
    if (/weakness|fatigue|tired/.test(text)) {
      return 'Weakness or fatigue can happen from poor sleep, dehydration, stress, anemia, or infection. Rest, fluids, and a balanced diet may help. If it keeps happening, discuss it with a doctor.'
    }
    if (/infection/.test(text)) {
      return 'Infection can cause fever, pain, swelling, or weakness. Rest and fluids are important. If symptoms worsen or breathing becomes difficult, see a doctor.'
    }
  }

  if (severity?.severity === 'Low' || severity?.severity === 'High' || severity?.severity === 'Critical') {
    return 'Your report has an abnormal value that should be reviewed by a doctor. If you have symptoms like weakness, dizziness, shortness of breath, or chest pain, please seek medical care promptly.'
  }

  return 'I can explain general health topics in simple terms, but I cannot diagnose or prescribe treatment. For serious symptoms, worsening problems, or anything urgent, please consult a doctor.'
}

const withDisclaimer = (text) => {
  const disclaimer = 'This is general guidance. Please consult a doctor for medical advice.'
  const cleanText = String(text || '').trim()
  return cleanText.includes(disclaimer) ? cleanText : `${cleanText}\n\n${disclaimer}`
}

const interpretHemoglobin = (hb) => {
  if (hb == null) return null
  if (hb < 7) return { label: 'very low', short: 'low' }
  if (hb < 12) return { label: 'low', short: 'low' }
  if (hb > 16) return { label: 'high', short: 'high' }
  return { label: 'normal', short: 'normal' }
}

const interpretWbc = (wbc) => {
  if (wbc == null) return null
  if (wbc < 4000) return { label: 'low', short: 'low' }
  if (wbc > 11000) return { label: 'high', short: 'high' }
  return { label: 'normal', short: 'normal' }
}

const interpretPlatelets = (platelets) => {
  if (platelets == null) return null
  if (platelets < 50000) return { label: 'very low', short: 'low' }
  if (platelets < 150000) return { label: 'low', short: 'low' }
  if (platelets > 450000) return { label: 'high', short: 'high' }
  return { label: 'normal', short: 'normal' }
}

const buildReportAwareReply = ({ message = '', severity = {}, questionType: forcedType = null } = {}) => {
  const text = String(message || '').toLowerCase()
  const questionType = forcedType || classifyQuestionType(message)
  const hb = severity?.values?.hemoglobin
  const wbc = severity?.values?.wbc
  const platelets = severity?.values?.platelets
  const hbInfo = interpretHemoglobin(hb)
  const wbcInfo = interpretWbc(wbc)
  const plateletInfo = interpretPlatelets(platelets)
  const abnormalCount = [hbInfo, wbcInfo, plateletInfo].filter((item) => item && item.short !== 'normal').length

  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|one side|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return withDisclaimer('This could be urgent. Please seek emergency medical care now or call local emergency services.')
  }

  if (questionType === 'report') {
    const parts = []
    if (hb != null) parts.push(`Hemoglobin: ${hb} (${hbInfo?.label || 'unknown'})`)
    if (wbc != null) parts.push(`WBC: ${wbc} (${wbcInfo?.label || 'unknown'})`)
    if (platelets != null) parts.push(`Platelets: ${platelets} (${plateletInfo?.label || 'unknown'})`)
    const summary = parts.length ? parts.join('. ') : 'I could not detect any report values clearly. Please paste the key values again.'
    return withDisclaimer(`Report summary: ${summary}`)
  }

  if (questionType === 'seriousness') {
    if (!abnormalCount) {
      return withDisclaimer('From the values I can see, this does not look serious right now, but you can still review it with a doctor if you have symptoms.')
    }
    if (severity?.severity === 'Critical') {
      return withDisclaimer('This needs attention. One of the values is in a very low range, so please contact a doctor promptly.')
    }
    if (abnormalCount === 1) {
      return withDisclaimer('This looks mild to moderate based on the values shown, but it should still be reviewed by a doctor.')
    }
    return withDisclaimer('This needs attention because more than one value is abnormal. Please discuss it with a doctor soon.')
  }

  if (questionType === 'action') {
    const steps = [
      'What you should do next:',
      '- Consult a doctor and share the report values',
      '- Rest and stay hydrated',
    ]
    if (hbInfo?.short === 'low') steps.push('- Eat iron-rich foods like leafy greens, beans, lentils, dates, and jaggery')
    if (wbcInfo?.short === 'high') steps.push('- Support recovery with fluids, sleep, and infection precautions')
    if (plateletInfo?.short === 'low') steps.push('- Avoid injuries or anything that could cause bleeding until a doctor reviews it')
    steps.push('- Follow any test or treatment advice you are given')
    return withDisclaimer(steps.join(' '))
  }

  if (questionType === 'diet') {
    const parts = ['Diet suggestions:']
    if (hbInfo?.short === 'low') {
      parts.push('Iron-rich foods like spinach, lentils, beans, dates, jaggery, eggs, or meat if you eat it.')
      parts.push('Add vitamin C foods like oranges, lemon, or amla with meals to help iron absorb better.')
    }
    if (wbcInfo?.short === 'high') {
      parts.push('Support immunity with fruits, vegetables, enough protein, and good hydration.')
    }
    if (plateletInfo?.short === 'low') {
      parts.push("Choose balanced meals and follow your doctor's advice if there is bleeding risk.")
    }
    if (parts.length === 1) {
      parts.push('Balanced meals with vegetables, fruits, protein, and enough water are a good choice.')
    }
    return withDisclaimer(parts.join(' '))
  }

  if (questionType === 'hemoglobin_meaning') {
    if (hb == null) {
      return withDisclaimer('Low hemoglobin means your blood may carry less oxygen than normal. It can happen with iron deficiency, blood loss, or other causes.')
    }
    if (hbInfo?.short === 'low') {
      return withDisclaimer(`Your hemoglobin is ${hb}, which is low. This can mean anemia or another cause of low blood oxygen carrying capacity.`)
    }
    return withDisclaimer(`Your hemoglobin is ${hb}, which is within the usual range.`)
  }

  if (questionType === 'surgery') {
    return withDisclaimer('Before surgery, follow your doctor or hospital instructions carefully. Make sure they know about your report values, medicines, allergies, and past illnesses. If hemoglobin is low or platelets are low, ask whether the surgery should be delayed or treated first. Do not stop or start medicines unless your doctor tells you to.')
  }

  if (questionType === 'anemia_symptoms') {
    const parts = [
      'Common symptoms of anemia include tiredness, weakness, dizziness, pale skin, shortness of breath, and fast heartbeat.',
    ]
    if (hbInfo?.short === 'low') {
      parts.push(`Your hemoglobin looks low (${hb}), so these symptoms may fit that finding.`)
    }
    parts.push('If symptoms are severe or sudden, seek medical care.')
    return withDisclaimer(parts.join(' '))
  }

  if (questionType === 'general') {
    if (abnormalCount) {
      const parts = []
      if (hb != null) parts.push(`Hemoglobin: ${hb} (${hbInfo?.label || 'unknown'})`)
      if (wbc != null) parts.push(`WBC: ${wbc} (${wbcInfo?.label || 'unknown'})`)
      if (platelets != null) parts.push(`Platelets: ${platelets} (${plateletInfo?.label || 'unknown'})`)
      return withDisclaimer(`${parts.join('. ')}.`)
    }
    if (Array.isArray(severity?.findings) && severity.findings.length) {
      return withDisclaimer(`Based on the wording in the report, there may be ${severity.findings.map((f) => f.label).join(', ')}. If you share exact values, I can analyze them more accurately.`)
    }
    if (/diabetes|sugar|glucose|blood sugar|bp|blood pressure|hypertension|pressure/.test(text)) {
      return withDisclaimer('For diabetes or blood pressure questions, the answer depends on your numbers, medicines, symptoms, and doctor advice. Common basics are taking medicines on time, eating balanced meals, staying active if allowed, and checking values regularly. If readings are very high or you feel dizzy, weak, have chest pain, confusion, or shortness of breath, seek medical care.')
    }
    if (/infection|fever|cold|cough|sore throat|flu/.test(text)) {
      return withDisclaimer('These symptoms can happen with an infection or a viral illness. Rest, fluids, and watching for worsening symptoms may help. If the fever is high, symptoms are getting worse, or breathing becomes difficult, please see a doctor.')
    }
    if (/recovery|healing|post[- ]?op|after surgery|post surgery/.test(text)) {
      return withDisclaimer('Recovery usually depends on the cause, your overall health, and the treatment plan. Follow discharge instructions, rest enough, eat well, and report any worsening pain, fever, bleeding, or weakness.')
    }
    if (/fever/.test(text)) {
      return withDisclaimer('Fever usually means the body is fighting an infection or inflammation. Rest, fluids, and watching for worsening symptoms can help. If it is high or lasts long, see a doctor.')
    }
    if (/cold|cough|sore throat|flu/.test(text)) {
      return withDisclaimer('A cold or mild viral illness often gets better with rest and fluids. Warm liquids may help. If breathing becomes difficult or symptoms worsen, consult a doctor.')
    }
    if (/headache/.test(text)) {
      return withDisclaimer('Headaches can happen from stress, dehydration, lack of sleep, or illness. Rest, water, and less screen strain may help. Seek care if it is sudden, severe, or unusual.')
    }
    if (/weakness|fatigue|tired/.test(text)) {
      return withDisclaimer('Weakness or fatigue can happen from poor sleep, dehydration, stress, anemia, or infection. Rest, fluids, and a balanced diet may help. If it keeps happening, discuss it with a doctor.')
    }
  }

  return withDisclaimer('I can explain general health topics in simple terms, but I cannot diagnose or prescribe treatment. If you share the report values or the main symptom, I can give a more specific answer.')
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
  const [reportData, setReportData] = useState('hemoglobin 8.5')
  const bottomRef = useRef(null)
  const messageListRef = useRef(null)
  const reportSummary = useMemo(() => parseReportSummary(reportData), [reportData])

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
      content: buildReportAwareReply({ message: messageText, severity: reportSummary }),
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage, localReply])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const endpoint = `${serverUrl}/api/health-chat/chat`
      const payload = {
        message: messageText,
        sessionId,
        chatHistory: messages.slice(-12),
        reportData,
        reportText: reportData,
        patientInfo,
      }
      console.log('[HealthChat] SENDING REPORT:', reportData)
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)
      console.log('[HealthChat] sending request', {
        endpoint,
        messageText,
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
          body: JSON.stringify(payload),
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
            content: buildReportAwareReply({ message: messageText, severity: reportSummary }),
          }
          return next
        }
        return [...next, {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          content: buildReportAwareReply({ message: messageText, severity: reportSummary }),
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
                key={q.label}
                type="button"
                onClick={() => appendSuggestion(q.prompt)}
                disabled={loading}
                className="text-left rounded-xl border border-border bg-white/80 px-4 py-3 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60"
              >
                {q.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm h-full">
          <CardContent className="p-4 md:p-5 h-full flex flex-col gap-4">
            <div className="flex items-center gap-2">
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
              <label className="text-xs font-medium text-muted-foreground">Report Data or OCR Summary</label>
              <Textarea
                value={reportData}
                onChange={(e) => setReportData(e.target.value)}
                placeholder="Paste key report values here, for example:\nHemoglobin: 8.5\nWBC: 12000\nPlatelets: 200000"
                className="min-h-[160px] resize-none rounded-2xl border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                Severity: {reportSummary.severity}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {reportSummary.summary}
              </Badge>
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
