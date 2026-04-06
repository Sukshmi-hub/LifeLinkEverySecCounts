import express from 'express'
import { authenticate } from '../middleware/auth.js'
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

async function callOpenAIChat(messages, userId) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
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

    const session = await MedicalChatSession.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { userId: req.user._id, messages: [], lastMessageAt: new Date() } },
      { upsert: true, new: true }
    )

    const recentMessages = normalizeHistory(session.messages).slice(-MAX_HISTORY_MESSAGES)
    const openAiMessages = [
      { role: 'system', content: MEDICAL_CHAT_PROMPT },
      ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const reply = await callOpenAIChat(openAiMessages, req.user._id)

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
    })
  } catch (err) {
    console.error('Medical chat failed:', err)
    return res.status(500).json({ success: false, message: safeAssistantFallback() })
  }
})

export default router
