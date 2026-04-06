import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from '../config/mongodb.js'
import Patient from '../models/Patient.js'
import MedicalChatSession from '../models/MedicalChatSession.js'

const router = express.Router()

const MEDICAL_CHAT_PROMPT = [
  'You are a helpful medical assistant for patients.',
  'Explain health-related topics in simple language.',
  'Do not provide diagnosis, do not prescribe medicines, and do not claim to replace a doctor.',
  'Always suggest consulting a doctor for serious symptoms, worsening symptoms, or anything urgent.',
  'If the user mentions chest pain, trouble breathing, stroke symptoms, heavy bleeding, fainting, severe allergic reaction, confusion, suicidal thoughts, or another emergency, tell them to seek emergency medical care immediately.',
  'Keep answers concise, practical, and easy to understand.',
  'Use bullet points when helpful.',
].join(' ')

const MAX_HISTORY_MESSAGES = 12
const MAX_SAVED_MESSAGES = 24
const SEVERITY_ORDER = { critical: 3, high: 2, low: 1, normal: 0 }
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_CHAT_TIMEOUT_MS || 10000)

function normalizeHistory(messages = []) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map((m) => ({
      id: String(m._id || m.id || ''),
      role: m.role,
      content: String(m.content || ''),
      createdAt: m.createdAt || m.timestamp || new Date(),
    }))
}

function safeAssistantFallback() {
  return 'Something went wrong. Please try again.'
}

function isDbReady() {
  return mongoose.connection.readyState === 1
}

function softAuthenticate(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '')
    if (!authHeader.startsWith('Bearer ')) {
      req.chatUser = null
      return next()
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET
    if (!secret) {
      req.chatUser = null
      return next()
    }

    const decoded = jwt.verify(token, secret)
    req.chatUser = {
      _id: decoded.userId ? String(decoded.userId) : null,
      role: decoded.role || 'patient',
    }
    return next()
  } catch (error) {
    console.warn('[health-chat] soft auth failed, continuing without session:', error?.message || error)
    req.chatUser = null
    return next()
  }
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const output = Array.isArray(data?.output) ? data.output : []
  for (const item of output) {
    if (!item) continue
    if (item.type === 'message' && Array.isArray(item.content)) {
      const text = item.content
        .map((part) => {
          if (!part) return ''
          if (typeof part.text === 'string') return part.text
          if (typeof part.value === 'string') return part.value
          return ''
        })
        .join('')
        .trim()
      if (text) return text
    }
  }
  return ''
}

function buildLocalMedicalReply(message) {
  const text = String(message || '').toLowerCase()

  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|one side|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return [
      'This could be urgent.',
      'Please seek emergency medical care now or call local emergency services.',
      'If possible, have someone stay with you until help arrives.',
    ].join(' ')
  }

  if (/hemoglobin|hb|anemia|anaemia/i.test(text)) {
    return [
      'Low hemoglobin can mean your blood may carry less oxygen than normal.',
      'Common causes include iron deficiency, vitamin deficiencies, blood loss, or some chronic illnesses.',
      'A doctor may suggest tests and treatment based on the cause.',
      'If you feel very weak, dizzy, short of breath, or have chest pain, please see a doctor promptly.',
    ].join(' ')
  }

  if (/before surgery|surgery prep|pre[- ]?op|operation/i.test(text)) {
    return [
      'Before surgery, follow your doctor or hospital instructions carefully.',
      'Common steps may include fasting, telling the doctor about medicines, allergies, and past illnesses, and arranging transportation and support after the procedure.',
      'Do not stop or start medicines unless your doctor tells you to.',
    ].join(' ')
  }

  if (/anemia|anaemia/i.test(text)) {
    return [
      'Common symptoms of anemia include tiredness, weakness, dizziness, pale skin, shortness of breath, and fast heartbeat.',
      'The exact cause matters, so a doctor may recommend blood tests and treatment.',
      'If symptoms are severe or sudden, seek medical care.',
    ].join(' ')
  }

  return [
    'I can explain general health topics in simple terms, but I cannot diagnose or prescribe treatment.',
    'For serious symptoms, worsening problems, or anything urgent, please consult a doctor.',
    'If you share the main symptom, report value, or question, I can give a simple general explanation.',
  ].join(' ')
}

function parseReportData(reportData) {
  if (!reportData) return { raw: '', fields: {}, notes: '' }

  if (typeof reportData === 'object') {
    const fields = {
      hemoglobin: reportData.hemoglobin ?? reportData.hb ?? reportData.Hb ?? reportData.HB ?? null,
      wbc: reportData.wbc ?? reportData.WBC ?? null,
      platelets: reportData.platelets ?? reportData.Platelets ?? reportData.platelet ?? null,
      bloodGroup: reportData.bloodGroup ?? reportData.blood_group ?? null,
      notes: reportData.notes ?? reportData.summary ?? reportData.text ?? '',
    }
    return {
      raw: JSON.stringify(reportData),
      fields,
      notes: String(fields.notes || ''),
    }
  }

  const raw = String(reportData || '')
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const fields = {}
  for (const line of lines) {
    const match = line.match(/^([A-Za-z ][A-Za-z0-9 /()-]{1,40})\s*[:=-]\s*(.+)$/)
    if (!match) continue
    const key = match[1].toLowerCase().trim()
    const value = match[2].trim()
    if (/hb|hemoglobin/.test(key) && fields.hemoglobin == null) fields.hemoglobin = value
    if (/wbc|white blood cell/.test(key) && fields.wbc == null) fields.wbc = value
    if (/platelet/.test(key) && fields.platelets == null) fields.platelets = value
    if (/blood group/.test(key) && fields.bloodGroup == null) fields.bloodGroup = value
  }

  return {
    raw,
    fields,
    notes: raw,
  }
}

function toNumber(value) {
  if (value == null) return null
  const n = Number(String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(n) ? n : null
}

function deriveSeverity(report) {
  const hb = toNumber(report?.fields?.hemoglobin)
  const wbc = toNumber(report?.fields?.wbc)
  const platelets = toNumber(report?.fields?.platelets)
  const flags = []

  if (hb != null && hb < 9) flags.push({ level: 'low', label: `Hemoglobin ${hb} is low` })
  if (platelets != null && platelets < 50000) flags.push({ level: 'critical', label: `Platelets ${platelets} are critically low` })
  if (wbc != null && wbc > 11000) flags.push({ level: 'high', label: `WBC ${wbc} is high` })

  const level = flags.reduce((current, item) => (
    SEVERITY_ORDER[item.level] > SEVERITY_ORDER[current] ? item.level : current
  ), 'normal')

  const labelMap = {
    critical: 'Critical',
    high: 'High',
    low: 'Low',
    normal: 'Normal',
  }

  return {
    level,
    label: labelMap[level],
    flags,
    values: { hemoglobin: hb, wbc, platelets },
    summary: flags.length ? flags.map((f) => f.label).join('; ') : 'No obvious high-risk lab pattern detected',
  }
}

function buildMedicalChatContext({ patient, report, severity, message, history }) {
  const patientInfo = [
    `Age: ${patient?.age ?? 'Unknown'}`,
    `Gender: ${patient?.gender ?? 'Unknown'}`,
    `Blood Group: ${patient?.bloodGroup ?? patient?.blood_type ?? 'Unknown'}`,
  ].join('\n')

  const reportLines = report?.raw
    ? `\n${report.raw}`.trim()
    : 'No report data provided.'

  const historyLines = Array.isArray(history) && history.length
    ? history.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${String(m.content || '').trim()}`).join('\n')
    : 'No prior conversation.'

  return [
    'You are a medical assistant.',
    '',
    'Patient Info:',
    patientInfo,
    '',
    'Medical Report:',
    reportLines,
    '',
    'Severity:',
    `Level: ${severity?.label || 'Unknown'}`,
    `Summary: ${severity?.summary || 'Unknown'}`,
    '',
    'Conversation:',
    historyLines,
    '',
    'User Question:',
    String(message || ''),
    '',
    'Instructions:',
    '- Explain in simple language',
    '- Use report data if available',
    '- Be safe and non-diagnostic',
    '- Suggest doctor if serious',
    '- Do not prescribe medicines',
    '- Do not give a final diagnosis',
  ].join('\n')
}

async function callOpenAIChat(messages, userId) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }

  const model = process.env.OPENAI_MEDICAL_CHAT_MODEL || 'gpt-4.1-mini'
  const input = messages.map((m) => ({
    role: m.role,
    content: [
      {
        type: 'input_text',
        text: String(m.content || ''),
      },
    ],
  }))
  const payload = {
    model,
    input,
    instructions: MEDICAL_CHAT_PROMPT,
    temperature: 0.2,
    max_output_tokens: 240,
    metadata: {
      app: 'lifelink',
      feature: 'patient_medical_chat',
    },
    safety_identifier: userId ? String(userId) : undefined,
  }

  console.log('[health-chat] OpenAI request', {
    model,
    inputCount: input.length,
    userId: userId ? String(userId) : null,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('OpenAI request timed out')), OPENAI_TIMEOUT_MS)

  let resp
  try {
    resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`OpenAI chat request failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  console.log('[health-chat] OpenAI response metadata', {
    id: data?.id || null,
    model: data?.model || null,
    hasOutput: Array.isArray(data?.output) && data.output.length > 0,
  })
  const content = extractResponseText(data)

  return content || safeAssistantFallback()
}

router.get('/history', softAuthenticate, async (req, res) => {
  try {
    if (!req.chatUser?._id || !isDbReady()) {
      return res.json({
        success: true,
        sessionId: null,
        messages: [],
      })
    }

    const session = await MedicalChatSession.findOne({ userId: req.chatUser._id }).lean()
    return res.json({
      success: true,
      sessionId: session ? String(session._id) : null,
      messages: normalizeHistory(session?.messages || []),
    })
  } catch (err) {
    console.error('Medical chat history failed:', err)
    return res.status(500).json({ success: false, message: safeAssistantFallback() })
  }
})

router.delete('/history', softAuthenticate, async (req, res) => {
  try {
    if (!req.chatUser?._id || !isDbReady()) {
      return res.json({ success: true, message: 'Conversation cleared' })
    }

    await MedicalChatSession.findOneAndDelete({ userId: req.chatUser._id })
    return res.json({ success: true, message: 'Conversation cleared' })
  } catch (err) {
    console.error('Medical chat clear failed:', err)
    return res.status(500).json({ success: false, message: safeAssistantFallback() })
  }
})

router.post('/chat', softAuthenticate, async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim()
    console.log('[health-chat] Incoming request', {
      userId: String(req.chatUser?._id || ''),
      messageLength: message.length,
      hasReportData: Boolean(req.body?.reportData),
      chatHistoryLength: Array.isArray(req.body?.chatHistory) ? req.body.chatHistory.length : 0,
    })
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' })
    }
    if (message.length > 1500) {
      return res.status(400).json({ success: false, message: 'Message is too long' })
    }

    const patientDoc = req.chatUser?._id && isDbReady()
      ? await Patient.findOne({ userId: req.chatUser._id }).lean()
      : null
    const incomingPatientInfo = req.body?.patientInfo && typeof req.body.patientInfo === 'object'
      ? req.body.patientInfo
      : {}
    const mergedPatient = {
      age: incomingPatientInfo.age ?? patientDoc?.age ?? null,
      gender: incomingPatientInfo.gender ?? patientDoc?.gender ?? 'Unknown',
      bloodGroup: incomingPatientInfo.bloodGroup ?? patientDoc?.blood_type ?? patientDoc?.bloodGroup ?? null,
    }
    const report = parseReportData(req.body?.reportData)
    const severity = deriveSeverity(report)
    const incomingHistory = Array.isArray(req.body?.chatHistory)
      ? normalizeHistory(req.body.chatHistory).slice(-MAX_HISTORY_MESSAGES)
      : []

    let session = null
    if (req.chatUser?._id && isDbReady()) {
      session = await MedicalChatSession.findOneAndUpdate(
        { userId: req.chatUser._id },
        { $setOnInsert: { userId: req.chatUser._id, messages: [], lastMessageAt: new Date() } },
        { upsert: true, new: true }
      )
    }

    const recentMessages = (incomingHistory.length ? incomingHistory : normalizeHistory(session?.messages || [])).slice(-MAX_HISTORY_MESSAGES)
    const openAiMessages = [
      { role: 'system', content: MEDICAL_CHAT_PROMPT },
      { role: 'user', content: buildMedicalChatContext({ patient: mergedPatient, report, severity, message, history: recentMessages }) },
    ]

    const openAIReply = await callOpenAIChat(openAiMessages, req.chatUser?._id).catch((err) => {
      console.warn('OpenAI medical chat unavailable, using fallback:', err?.message || err)
      return null
    })
    const reply = openAIReply || buildLocalMedicalReply([
      message,
      report?.raw || '',
      severity?.summary || '',
    ].join(' '))

    if (session) {
      session.messages.push(
        { role: 'user', content: message, createdAt: new Date() },
        { role: 'assistant', content: reply, createdAt: new Date() }
      )
      if (session.messages.length > MAX_SAVED_MESSAGES) {
        session.messages = session.messages.slice(-MAX_SAVED_MESSAGES)
      }
      session.lastMessageAt = new Date()
      await session.save()
    }

    return res.json({
      success: true,
      reply,
      sessionId: session ? String(session._id) : null,
      messages: session ? normalizeHistory(session.messages) : [
        { role: 'user', content: message, createdAt: new Date() },
        { role: 'assistant', content: reply, createdAt: new Date() },
      ],
      severity,
      reportSummary: {
        hasReport: Boolean(report?.raw),
        values: severity.values,
        summary: severity.summary,
      },
      source: openAIReply ? 'openai' : 'fallback',
      debug: {
        receivedMessageLength: message.length,
        reportKeys: report?.fields ? Object.keys(report.fields).filter(Boolean) : [],
      },
    })
  } catch (err) {
    console.error('Medical chat failed:', err)
    return res.status(200).json({
      success: true,
      reply: buildLocalMedicalReply(String(req.body?.message || '')),
      severity: { level: 'unknown', label: 'Unknown', summary: 'Unable to analyze report data' },
      source: 'fallback',
      debug: { error: err?.message || 'unknown' },
    })
  }
})

export default router
