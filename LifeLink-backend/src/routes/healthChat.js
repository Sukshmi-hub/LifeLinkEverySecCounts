import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from '../config/mongodb.js'
import Patient from '../models/Patient.js'
import MedicalChatSession from '../models/MedicalChatSession.js'

const router = express.Router()

const MEDICAL_CHAT_PROMPT = [
  'You are a smart medical assistant for a healthcare platform.',
  'Use the report data when it is provided, but answer general medical questions normally when the report is not relevant.',
  'Do not give the same generic answer for every question.',
  'Do not repeat the same explanation unless the question is specifically about it.',
  'Analyze all values present, including Hemoglobin, WBC, Platelets, and any other report values that are provided.',
  'If some values are missing, answer based on the available data.',
  'Keep answers simple, clear, and patient-friendly.',
  'If the question is about report explanation, summarize all values, mention what is normal or abnormal, and give an overall interpretation.',
  'If the question is about seriousness, evaluate severity using all values and say whether it is mild, moderate, or needs attention, with reasons.',
  'If the question is about what to do, give actionable steps such as doctor consultation, lifestyle changes, and precautions.',
  'If the question is about diet, suggest food based on the abnormalities, such as iron-rich foods for low hemoglobin and immunity-supporting foods for high WBC.',
  'If the question is about low hemoglobin, only explain hemoglobin unless other values are needed for safety.',
  'If the question is about surgery, focus on hemoglobin, WBC, platelets, readiness, precautions, and when surgery may need to be delayed.',
  'If the question is about symptoms of anemia, answer generally and relate it to the user values if hemoglobin is low.',
  'If the question is about urgent doctor care, mention warning signs based on the report values.',
  'Use age when it matters, and be a little more cautious for children or older adults.',
  'Always include: This is general guidance. Please consult a doctor for medical advice.',
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

function withDisclaimer(text) {
  const disclaimer = 'This is general guidance. Please consult a doctor for medical advice.'
  const cleanText = String(text || '').trim()
  if (!cleanText) return disclaimer
  return cleanText.includes(disclaimer) ? cleanText : `${cleanText}\n\n${disclaimer}`
}

function classifyQuestionType(message = '') {
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

function normalizeMeaningfulValue(value) {
  if (value == null) return null
  const str = String(value).trim()
  return str ? str : null
}

function extractKeywordFindings(text = '') {
  const raw = String(text || '').toLowerCase()
  const findings = []
  if (/low hemoglobin|low hb|anemia|anaemia/.test(raw)) findings.push({ key: 'hemoglobin', label: 'low hemoglobin' })
  if (/high wbc|wbc high|infection|inflammation/.test(raw)) findings.push({ key: 'wbc', label: 'high WBC' })
  if (/low platelets|platelets low|platelet low|thrombocytopenia/.test(raw)) findings.push({ key: 'platelets', label: 'low platelets' })
  if (/high sugar|high glucose|diabetes|blood sugar high/.test(raw)) findings.push({ key: 'glucose', label: 'high sugar' })
  if (/high bp|high blood pressure|hypertension/.test(raw)) findings.push({ key: 'bp', label: 'high blood pressure' })
  return findings
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

function buildLocalMedicalReply({ message = '', report = null, severity = null, questionType = null }) {
  const text = String(message || '').toLowerCase()
  const type = questionType || classifyQuestionType(text)
  const hb = severity?.values?.hemoglobin ?? toNumber(report?.fields?.hemoglobin)
  const wbc = severity?.values?.wbc ?? toNumber(report?.fields?.wbc)
  const platelets = severity?.values?.platelets ?? toNumber(report?.fields?.platelets)
  const hbInfo = interpretHemoglobin(hb)
  const wbcInfo = interpretWbc(wbc)
  const plateletInfo = interpretPlatelets(platelets)

  if (/chest pain|trouble breathing|shortness of breath|faint|fainting|stroke|one side|severe bleeding|allergic reaction|suicidal|confusion/i.test(text)) {
    return [
      'This could be urgent.',
      'Please seek emergency medical care now or call local emergency services.',
      'If possible, have someone stay with you until help arrives.',
    ].join(' ')
  }

  if (type === 'report') {
    const summary = buildValueSummary({ report, severity })
    if (summary === 'No clear report values were provided.') {
      return "I couldn't detect clear medical values. Please enter values like Hemoglobin, WBC, Platelets for better analysis."
    }
    return [
      'Report summary:',
      summary,
      'If you want, I can also explain what this means in simple language.',
    ].join(' ')
  }

  if (type === 'seriousness') {
    const abnormalCount = [hbInfo, wbcInfo, plateletInfo].filter((item) => item && item.short !== 'normal').length
    if (!abnormalCount) {
      return 'From the values I can see, this does not look serious right now, but you can still review it with a doctor if you have symptoms.'
    }
    if (severity?.level === 'critical') {
      return 'This needs attention. One of the values is in a very low range, so please contact a doctor promptly.'
    }
    if (abnormalCount === 1) {
      return 'This looks mild to moderate based on the values shown, but it should still be reviewed by a doctor.'
    }
    return 'This needs attention because more than one value is abnormal. Please discuss it with a doctor soon.'
  }

  if (type === 'action') {
    const steps = [
      'What you should do next:',
      '- Consult a doctor and share the report values',
      '- Rest and stay hydrated',
    ]
    if (hbInfo?.short === 'low') steps.push('- Eat iron-rich foods like leafy greens, beans, lentils, dates, and jaggery')
    if (wbcInfo?.short === 'high') steps.push('- Support recovery with fluids, sleep, and infection precautions')
    if (plateletInfo?.short === 'low') steps.push('- Avoid injuries or anything that could cause bleeding until a doctor reviews it')
    steps.push('- Follow any test or treatment advice you are given')
    return steps.join(' ')
  }

  if (type === 'diet') {
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
    return parts.join(' ')
  }

  if (type === 'hemoglobin_meaning') {
    if (hb == null) {
      return 'Low hemoglobin means your blood may carry less oxygen than normal. It can happen with iron deficiency, blood loss, or other causes.'
    }
    if (hbInfo?.short === 'low') {
      return `Your hemoglobin is ${hb}, which is low. This can mean anemia or another cause of low blood oxygen carrying capacity.`
    }
    return `Your hemoglobin is ${hb}, which is within the usual range.`
  }

  if (type === 'surgery') {
    const points = [
      'Before surgery, follow your doctor or hospital instructions carefully.',
      'Make sure they know about your report values, medicines, allergies, and past illnesses.',
      'If hemoglobin is low or platelets are low, ask whether the surgery should be delayed or treated first.',
      'Do not stop or start medicines unless your doctor tells you to.',
    ]
    return points.join(' ')
  }

  if (type === 'anemia_symptoms') {
    const symptoms = [
      'Common symptoms of anemia include tiredness, weakness, dizziness, pale skin, shortness of breath, and fast heartbeat.',
    ]
    if (hbInfo?.short === 'low') {
      symptoms.push(`Your hemoglobin looks low (${hb}), so these symptoms may fit that finding.`)
    }
    symptoms.push('If symptoms are severe or sudden, seek medical care.')
    return symptoms.join(' ')
  }

  if (type === 'general') {
    const reportSummary = buildValueSummary({ report, severity })
    if (reportSummary !== 'No clear report values were provided.') {
      return [
        reportSummary,
        'If you want a specific answer, you can ask about report explanation, seriousness, diet, surgery, or anemia symptoms.',
      ].join(' ')
    }
    if (/diabetes|sugar|glucose|blood sugar|bp|blood pressure|hypertension|pressure/.test(text)) {
      return [
        'For diabetes or blood pressure questions, the best answer depends on your numbers, medicines, symptoms, and doctor advice.',
        'Common basics are taking medicines on time, eating balanced meals, staying active if allowed, and checking values regularly.',
        'If readings are very high or you feel dizzy, weak, chest pain, confusion, or shortness of breath, seek medical care.',
      ].join(' ')
    }
    if (/infection|fever|cold|cough|sore throat|flu/.test(text)) {
      return [
        'These symptoms can happen with an infection or a viral illness.',
        'Rest, fluids, and watching for worsening symptoms may help.',
        'If the fever is high, symptoms are getting worse, or breathing becomes difficult, please see a doctor.',
      ].join(' ')
    }
    if (/recovery|healing|post[- ]?op|after surgery|post surgery/.test(text)) {
      return [
        'Recovery usually depends on the cause, your overall health, and the treatment plan.',
        'Follow discharge instructions, rest enough, eat well, and report any worsening pain, fever, bleeding, or weakness.',
      ].join(' ')
    }
    if (/fever/.test(text)) {
      return [
        'Fever usually means the body is fighting an infection or inflammation.',
        'Rest, fluids, and watching for worsening symptoms can help.',
        'If the fever is high, lasts long, or comes with breathing trouble or confusion, see a doctor.',
      ].join(' ')
    }
    if (/cold|cough|sore throat|flu/.test(text)) {
      return [
        'A cold or mild viral illness often gets better with rest and fluids.',
        'Warm liquids and simple home care may help comfort.',
        'If breathing becomes difficult or symptoms worsen, consult a doctor.',
      ].join(' ')
    }
    if (/headache/.test(text)) {
      return [
        'Headaches can happen from stress, dehydration, lack of sleep, or illness.',
        'Rest, water, and reduced screen strain may help.',
        'Seek medical help if the headache is sudden, severe, or unusual for you.',
      ].join(' ')
    }
    if (/weakness|fatigue|tired/.test(text)) {
      return [
        'Weakness or fatigue can happen from poor sleep, dehydration, stress, anemia, or infection.',
        'Rest, fluids, and a balanced diet may help.',
        'If it keeps happening or feels severe, discuss it with a doctor.',
      ].join(' ')
    }
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
    const notes = reportData.notes ?? reportData.summary ?? reportData.text ?? ''
    const fields = {
      hemoglobin: normalizeMeaningfulValue(reportData.hemoglobin ?? reportData.hb ?? reportData.Hb ?? reportData.HB),
      wbc: normalizeMeaningfulValue(reportData.wbc ?? reportData.WBC),
      platelets: normalizeMeaningfulValue(reportData.platelets ?? reportData.Platelets ?? reportData.platelet),
      bloodGroup: normalizeMeaningfulValue(reportData.bloodGroup ?? reportData.blood_group),
      notes,
    }
    return {
      raw: JSON.stringify(reportData),
      fields,
      notes: String(notes || ''),
      findings: extractKeywordFindings([fields.notes, JSON.stringify(reportData)].join(' ')),
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
    findings: extractKeywordFindings(raw),
  }
}

function toNumber(value) {
  if (value == null) return null
  const n = Number(String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(n) ? n : null
}

function interpretHemoglobin(hb) {
  if (hb == null) return null
  if (hb < 7) return { label: 'very low', short: 'low', note: 'This is quite low and needs attention.' }
  if (hb < 12) return { label: 'low', short: 'low', note: 'This may suggest anemia.' }
  if (hb > 16) return { label: 'high', short: 'high', note: 'This is above the usual range.' }
  return { label: 'normal', short: 'normal', note: 'This is within the usual range.' }
}

function interpretWbc(wbc) {
  if (wbc == null) return null
  if (wbc < 4000) return { label: 'low', short: 'low', note: 'This can mean lower-than-usual immune cells.' }
  if (wbc > 11000) return { label: 'high', short: 'high', note: 'This may happen with infection or inflammation.' }
  return { label: 'normal', short: 'normal', note: 'This is within the usual range.' }
}

function interpretPlatelets(platelets) {
  if (platelets == null) return null
  if (platelets < 50000) return { label: 'very low', short: 'low', note: 'This can raise bleeding risk and needs prompt attention.' }
  if (platelets < 150000) return { label: 'low', short: 'low', note: 'This can raise bleeding risk.' }
  if (platelets > 450000) return { label: 'high', short: 'high', note: 'This may raise clot risk and should be reviewed.' }
  return { label: 'normal', short: 'normal', note: 'This is within the usual range.' }
}

function buildValueSummary({ report, severity }) {
  const hb = severity?.values?.hemoglobin ?? toNumber(report?.fields?.hemoglobin)
  const wbc = severity?.values?.wbc ?? toNumber(report?.fields?.wbc)
  const platelets = severity?.values?.platelets ?? toNumber(report?.fields?.platelets)
  const findings = Array.isArray(report?.findings) ? report.findings : extractKeywordFindings([report?.notes, report?.raw].filter(Boolean).join(' '))

  const parts = []
  const hbInfo = interpretHemoglobin(hb)
  const wbcInfo = interpretWbc(wbc)
  const plateletInfo = interpretPlatelets(platelets)

  if (hb != null) parts.push(`Hemoglobin: ${hb} (${hbInfo?.label || 'unknown'}). ${hbInfo?.note || ''}`.trim())
  if (wbc != null) parts.push(`WBC: ${wbc} (${wbcInfo?.label || 'unknown'}). ${wbcInfo?.note || ''}`.trim())
  if (platelets != null) parts.push(`Platelets: ${platelets} (${plateletInfo?.label || 'unknown'}). ${plateletInfo?.note || ''}`.trim())

  if (!parts.length && findings.length) {
    const keywordNotes = findings.map((item) => {
      if (item.key === 'hemoglobin') return 'Possible low hemoglobin pattern.'
      if (item.key === 'wbc') return 'Possible high WBC / infection pattern.'
      if (item.key === 'platelets') return 'Possible low platelets / bleeding risk pattern.'
      if (item.key === 'glucose') return 'Possible high sugar pattern.'
      if (item.key === 'bp') return 'Possible high blood pressure pattern.'
      return item.label
    })
    parts.push(`Based on the wording in the report: ${keywordNotes.join(' ')}`)
  }

  if (!parts.length) return 'No clear report values were provided.'
  return parts.join(' ')
}

function deriveSeverity(report) {
  const hb = toNumber(report?.fields?.hemoglobin)
  const wbc = toNumber(report?.fields?.wbc)
  const platelets = toNumber(report?.fields?.platelets)
  const flags = []

  if (hb != null && hb < 7) flags.push({ level: 'critical', label: `Hemoglobin ${hb} is very low` })
  else if (hb != null && hb < 12) flags.push({ level: 'low', label: `Hemoglobin ${hb} is low` })

  if (platelets != null && platelets < 50000) flags.push({ level: 'critical', label: `Platelets ${platelets} are critically low` })
  else if (platelets != null && platelets < 150000) flags.push({ level: 'low', label: `Platelets ${platelets} are low` })
  else if (platelets != null && platelets > 450000) flags.push({ level: 'high', label: `Platelets ${platelets} are high` })

  if (wbc != null && wbc < 4000) flags.push({ level: 'low', label: `WBC ${wbc} is low` })
  else if (wbc != null && wbc > 11000) flags.push({ level: 'high', label: `WBC ${wbc} is high` })

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
    'You are a smart medical assistant for a healthcare platform.',
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
    'Question Type:',
    classifyQuestionType(message),
    '',
    'Instructions:',
    '- ONLY answer based on the report data provided by the user.',
    '- Analyze all available values, not just hemoglobin.',
    '- Keep answers simple, clear, patient-friendly, and non-repetitive.',
    '- If some values are missing, answer from the available data.',
    '- Do not give a diagnosis or prescribe medicine.',
    '- If the question is about report explanation, summarize all values and mention what is normal or abnormal.',
    '- If the question is about seriousness, say whether it is mild, moderate, or needs attention.',
    '- If the question is about diet, give food suggestions that match the abnormal values.',
    '- If the question is about surgery, focus on immunity, blood levels, and precautions.',
    '- If the question is about anemia symptoms, answer generally and relate it to the report if hemoglobin is low.',
    '- If urgent warning signs are present, tell the user to seek medical care quickly.',
    '- Always include: This is general guidance. Please consult a doctor for medical advice.',
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
    const questionType = classifyQuestionType(message)
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
    const reply = withDisclaimer(openAIReply || buildLocalMedicalReply({
      message,
      report,
      severity,
      questionType,
    }))

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
        questionType,
      },
    })
  } catch (err) {
    console.error('Medical chat failed:', err)
    return res.status(200).json({
      success: true,
      reply: withDisclaimer(buildLocalMedicalReply({
        message: String(req.body?.message || ''),
        report: parseReportData(req.body?.reportData),
        severity: deriveSeverity(parseReportData(req.body?.reportData)),
        questionType: classifyQuestionType(String(req.body?.message || '')),
      })),
      severity: { level: 'unknown', label: 'Unknown', summary: 'Unable to analyze report data' },
      source: 'fallback',
      debug: { error: err?.message || 'unknown' },
    })
  }
})

export default router
