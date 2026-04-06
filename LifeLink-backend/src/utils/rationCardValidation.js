import fs from 'fs/promises'
import path from 'path'

const ACCEPTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

const POSITIVE_TERMS = [
  'ration card',
  'rations card',
  'nfsa',
  'national food security act',
  'food security',
  'public distribution system',
  'family head',
  'state government',
  'department of food',
  'food and civil supplies',
  'food civil supplies',
  'household details',
  'fair price shop',
  'household ration',
]

const NEGATIVE_TERMS = [
  'aadhaar',
  'aadhar',
  'pan card',
  'permanent account number',
  'passport',
  'driving licence',
  'driver license',
  'voter id',
  'selfie',
  'profile photo',
  'income tax',
  'government of india unique identification authority',
]

const FILE_HINTS = ['ration', 'nfsa', 'food', 'card']

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[^a-z0-9@/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countMatches(text, terms) {
  let count = 0
  const found = []
  for (const term of terms) {
    if (text.includes(term)) {
      count += 1
      found.push(term)
    }
  }
  return { count, found }
}

function previewText(text, max = 400) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  return clean.slice(0, max)
}

function inferDocumentType(text) {
  const normalized = normalizeText(text)
  const negative = countMatches(normalized, NEGATIVE_TERMS)
  if (negative.count > 0) {
    if (normalized.includes('aadhaar') || normalized.includes('aadhar')) return 'aadhaar'
    if (normalized.includes('pan')) return 'pan'
    if (normalized.includes('passport')) return 'passport'
    return 'other_id'
  }
  const positive = countMatches(normalized, POSITIVE_TERMS)
  if (positive.count > 0) return 'ration_card'
  return 'unknown'
}

function classifyText(text) {
  const normalized = normalizeText(text)
  const positive = countMatches(normalized, POSITIVE_TERMS)
  const negative = countMatches(normalized, NEGATIVE_TERMS)
  const fileHints = countMatches(normalized, FILE_HINTS)
  const length = normalized.length

  if (!length || length < 30) {
    return {
      status: 'retry',
      isValid: false,
      confidence: 0.05,
      reason: 'OCR text is too short or unreadable. Please upload a clearer image or a searchable PDF.',
      detectedType: 'unknown',
      positive,
      negative,
    }
  }

  if (negative.count > 0 && positive.count === 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.05,
      reason: `Document looks like ${inferDocumentType(normalized)} rather than a ration card.`,
      detectedType: inferDocumentType(normalized),
      positive,
      negative,
    }
  }

  const strongRationSignals = positive.found.some(term => ['ration card', 'nfsa', 'food security', 'public distribution system'].includes(term))
  const adminSignals = positive.found.some(term => ['state government', 'department of food', 'food and civil supplies', 'family head'].includes(term))

  const score =
    (positive.count * 0.24) +
    (strongRationSignals ? 0.28 : 0) +
    (adminSignals ? 0.15 : 0) +
    (fileHints.count > 0 ? 0.08 : 0) -
    (negative.count * 0.35)

  const confidence = Math.max(0, Math.min(0.98, score))

  if (positive.count >= 2 && strongRationSignals && negative.count === 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Ration card keywords detected.',
      detectedType: 'ration_card',
      positive,
      negative,
    }
  }

  if (positive.count >= 3 && negative.count === 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Document text matches a ration card pattern.',
      detectedType: 'ration_card',
      positive,
      negative,
    }
  }

  if (negative.count > 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence,
      reason: `Text matches other document type keywords: ${negative.found.slice(0, 3).join(', ')}`,
      detectedType: inferDocumentType(normalized),
      positive,
      negative,
    }
  }

  return {
    status: 'invalid',
    isValid: false,
    confidence,
    reason: 'Required ration card keywords were not found.',
    detectedType: 'unknown',
    positive,
    negative,
  }
}

async function readFileBuffer(file) {
  if (!file) throw new Error('No file uploaded')
  if (file.buffer) return file.buffer
  if (file.path) return fs.readFile(file.path)
  if (file.filename) {
    throw new Error('Cannot resolve file buffer without a path')
  }
  throw new Error('Unsupported file payload')
}

async function extractTextFromPdf(file) {
  const buffer = await readFileBuffer(file)
  const pdfModule = await import('pdf-parse')
  const pdfParse = pdfModule.default || pdfModule
  const data = await pdfParse(buffer)
  return String(data.text || '')
}

async function extractTextFromImage(file) {
  const buffer = await readFileBuffer(file)
  const tesseractModule = await import('tesseract.js')
  const createWorker = tesseractModule.createWorker || (tesseractModule.default && tesseractModule.default.createWorker)
  if (!createWorker) {
    throw new Error('tesseract.js createWorker is unavailable')
  }

  const worker = await createWorker('eng')
  try {
    const result = await worker.recognize(buffer)
    return String(result?.data?.text || '')
  } finally {
    await worker.terminate()
  }
}

async function extractTextFromFile(file) {
  const name = String(file?.originalname || file?.filename || '').toLowerCase()
  const mime = String(file?.mimetype || '').toLowerCase()
  const ext = path.extname(name)

  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    throw new Error('Only JPG, PNG, and PDF files are supported')
  }

  if (mime.includes('pdf') || ext === '.pdf') {
    return extractTextFromPdf(file)
  }

  return extractTextFromImage(file)
}

async function runOptionalOpenAiCheck(extractedText) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || String(process.env.ENABLE_OPENAI_RATION_CARD_CHECK || '').toLowerCase() !== 'true') {
    return null
  }

  const model = process.env.OPENAI_RATION_CARD_MODEL || 'gpt-4.1-mini'
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You validate Indian support documents. Return only strict JSON with keys is_ration_card, confidence, reason. Determine whether the text is from a ration card document.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Extracted text:\n${extractedText}`
          }
        ]
      }
    ],
    temperature: 0
  }

  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`OpenAI validation failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  const outputText = extractOpenAiOutputText(data)
  if (!outputText) return null

  try {
    const parsed = JSON.parse(outputText)
    return {
      is_ration_card: Boolean(parsed.is_ration_card),
      confidence: Number(parsed.confidence || 0),
      reason: String(parsed.reason || ''),
    }
  } catch (err) {
    return null
  }
}

function extractOpenAiOutputText(responseJson) {
  if (!responseJson) return ''
  if (typeof responseJson.output_text === 'string') return responseJson.output_text.trim()

  const pieces = []
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') pieces.push(content.text)
      if (typeof content.output_text === 'string') pieces.push(content.output_text)
    }
  }
  return pieces.join('\n').trim()
}

async function validateRationCardFile(file) {
  if (!file) {
    return {
      isValid: false,
      status: 'invalid',
      reason: 'No file uploaded',
      confidence: 0,
      detectedType: 'unknown',
      extractedText: '',
      extractedTextPreview: '',
    }
  }

  const extractedText = await extractTextFromFile(file)
  let heuristic = classifyText(extractedText)
  const ai = await runOptionalOpenAiCheck(extractedText).catch(() => null)

  if (ai && typeof ai.is_ration_card === 'boolean') {
    const aiConfidence = Number(ai.confidence || 0)
    if (ai.is_ration_card && aiConfidence >= 0.6 && heuristic.status !== 'invalid') {
      heuristic = {
        ...heuristic,
        status: 'valid',
        isValid: true,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || heuristic.reason,
        aiAnalysis: ai,
      }
    } else if (!ai.is_ration_card && aiConfidence >= 0.75) {
      heuristic = {
        ...heuristic,
        status: 'invalid',
        isValid: false,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || 'AI model did not identify this as a ration card.',
        aiAnalysis: ai,
      }
    } else {
      heuristic = {
        ...heuristic,
        aiAnalysis: ai,
      }
    }
  }

  return {
    ...heuristic,
    extractedText,
    extractedTextPreview: previewText(extractedText),
  }
}

export {
  ACCEPTED_EXTENSIONS,
  classifyText,
  extractTextFromFile,
  validateRationCardFile,
}
