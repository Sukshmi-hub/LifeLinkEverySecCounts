import express from 'express'
import { authenticate } from '../middleware/auth.js'
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
  const payload = {
    model,
    messages,
    temperature: 0.2,
    max_completion_tokens: 240,
    n: 1,
    safety_identifier: userId ? String(userId) : undefined,
    metadata: {
      app: 'lifelink',
      feature: 'patient_medical_chat',
    },
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`OpenAI chat request failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  const rawContent = data?.choices?.[0]?.message?.content
  const content = Array.isArray(rawContent)
    ? rawContent.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
    : String(rawContent || '').trim()

  return content || safeAssistantFallback()
}

router.get('/history', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (String(req.user.role).toLowerCase() !== 'patient') {
      return res.status(403).json({ success: false, message: 'Patients only' })
    }

    const session = await MedicalChatSession.findOne({ userId: req.user._id }).lean()
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

router.delete('/history', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (String(req.user.role).toLowerCase() !== 'patient') {
      return res.status(403).json({ success: false, message: 'Patients only' })
    }

    await MedicalChatSession.findOneAndDelete({ userId: req.user._id })
    return res.json({ success: true, message: 'Conversation cleared' })
  } catch (err) {
    console.error('Medical chat clear failed:', err)
    return res.status(500).json({ success: false, message: safeAssistantFallback() })
  }
})

router.post('/chat', authenticate, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    if (String(req.user.role).toLowerCase() !== 'patient') {
      return res.status(403).json({ success: false, message: 'Patients only' })
    }

    const message = String(req.body?.message || '').trim()
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' })
    }
    if (message.length > 1500) {
      return res.status(400).json({ success: false, message: 'Message is too long' })
    }

  const patientDoc = await Patient.findOne({ userId: req.user._id }).lean()
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

    const session = await MedicalChatSession.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { userId: req.user._id, messages: [], lastMessageAt: new Date() } },
      { upsert: true, new: true }
    )

    const recentMessages = (incomingHistory.length ? incomingHistory : normalizeHistory(session.messages)).slice(-MAX_HISTORY_MESSAGES)
    const openAiMessages = [
      { role: 'system', content: MEDICAL_CHAT_PROMPT },
      { role: 'user', content: buildMedicalChatContext({ patient: mergedPatient, report, severity, message, history: recentMessages }) },
    ]

    const openAIReply = await callOpenAIChat(openAiMessages, req.user._id).catch((err) => {
      console.warn('OpenAI medical chat unavailable, using fallback:', err?.message || err)
      return null
    })
    const reply = openAIReply || buildLocalMedicalReply([
      message,
      report?.raw || '',
      severity?.summary || '',
    ].join(' '))

    session.messages.push(
      { role: 'user', content: message, createdAt: new Date() },
      { role: 'assistant', content: reply, createdAt: new Date() }
    )
    if (session.messages.length > MAX_SAVED_MESSAGES) {
      session.messages = session.messages.slice(-MAX_SAVED_MESSAGES)
    }
    session.lastMessageAt = new Date()
    await session.save()

    return res.json({
      success: true,
      reply,
      sessionId: String(session._id),
      messages: normalizeHistory(session.messages),
      severity,
      reportSummary: {
        hasReport: Boolean(report?.raw),
        values: severity.values,
        summary: severity.summary,
      },
      source: openAIReply ? 'openai' : 'fallback',
    })
  } catch (err) {
    console.error('Medical chat failed:', err)
    return res.status(200).json({
      success: true,
      reply: buildLocalMedicalReply(String(req.body?.message || '')),
      severity: { level: 'unknown', label: 'Unknown', summary: 'Unable to analyze report data' },
      source: 'fallback',
    })
  }
})

export default router
