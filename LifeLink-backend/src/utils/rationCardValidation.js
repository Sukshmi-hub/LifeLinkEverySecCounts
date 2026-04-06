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
  'priority household',
  'priority household phh',
  'ration card no',
  'ration card number',
  'government of nct of delhi',
  'family head',
  'state government',
  'department of food',
  'food and civil supplies',
  'food civil supplies',
  'household details',
  'entitlement details',
  'family members',
  'fair price shop details',
  'fair price shop',
  'fps id',
  'valid till',
  'head of family',
  'fair price shop',
  'household ration',
  'rice',
  'wheat',
  'sugar',
  'kerosene',
]

const HARD_NEGATIVE_TERMS = [
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

const SOFT_NEGATIVE_TERMS = [
  'aadhaar',
  'aadhar',
]

const AADHAAR_KEY_TERMS = [
  'aadhaar',
  'government of india',
  'unique identification authority of india',
  'uidai',
]

const AADHAAR_FRAUD_TERMS = [
  'pan card',
  'passport',
  'ration card',
  'driving licence',
  'driver license',
  'selfie',
  'profile photo',
]

const FILE_HINTS = ['ration', 'nfsa', 'food', 'card']
const AADHAAR_NUMBER_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/

const BLOOD_MEDICAL_TERMS = [
  'hemoglobin',
  'hb',
  'rbc',
  'wbc',
  'platelet',
  'cbc',
  'complete blood count',
  'hematology',
  'blood test',
  'blood test report',
  'report',
  'lab',
  'differential count',
  'parameter',
  'result',
  'units',
  'reference range',
]

const BLOOD_LAB_TERMS = [
  'laboratory',
  'diagnostics',
  'pathology',
  'clinic',
  'hospital laboratory',
  'medical laboratory',
  'citycare diagnostics',
  'diagnostic centre',
  'diagnostic center',
]

const BLOOD_STRONG_HEADER_TERMS = [
  'blood test report',
  'complete blood count',
  'cbc',
  'hematology',
  'reference range',
  'parameter',
  'result',
  'lab report',
]

const BLOOD_FRAUD_TERMS = [
  'aadhaar',
  'aadhar',
  'pan card',
  'passport',
  'ration card',
  'invoice',
  'bill',
  'selfie',
  'profile photo',
]

const BLOOD_NUMERIC_REGEX = /\d+(?:\.\d+)?\s?(g\/dl|mg\/dl|%)/gi
const BLOOD_TABLE_ROW_REGEX = /(hemoglobin|hb|rbc|wbc|platelet|cbc)\s*[:\-]\s*\d+(?:\.\d+)?/gi

const FITNESS_CORE_TERMS = [
  'fitness certificate',
  'medically fit',
  'fit for',
  'physical fitness',
  'medical certificate',
  'certified that',
  'fit to donate',
  'fit for donation',
  'fit for surgery',
]

const FITNESS_DOCTOR_TERMS = [
  'doctor',
  'dr.',
  'medical officer',
  'physician',
  'hospital',
  'clinic',
]

const FITNESS_PATIENT_TERMS = [
  'name',
  'age',
  'gender',
  'patient',
]

const FITNESS_DATE_SIGNATURE_TERMS = [
  'date',
  'signature',
  'seal',
  'registration number',
  'regn no',
  'reg no',
]

const FITNESS_FRAUD_TERMS = [
  'aadhaar',
  'aadhar',
  'pan card',
  'ration card',
  'blood report',
  'invoice',
  'bill',
  'passport',
]

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
  const negative = countMatches(normalized, HARD_NEGATIVE_TERMS)
  if (negative.count > 0) {
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
  const hardNegative = countMatches(normalized, HARD_NEGATIVE_TERMS)
  const softNegative = countMatches(normalized, SOFT_NEGATIVE_TERMS)
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
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  if (hardNegative.count > 0 && positive.count === 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.05,
      reason: `Document looks like ${inferDocumentType(normalized)} rather than a ration card.`,
      detectedType: inferDocumentType(normalized),
      positive,
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  const strongRationSignals = positive.found.some(term => [
    'ration card',
    'ration card no',
    'ration card number',
    'nfsa',
    'national food security act',
    'food security',
    'public distribution system',
    'government of nct of delhi',
    'priority household',
    'priority household phh',
  ].includes(term))
  const adminSignals = positive.found.some(term => [
    'state government',
    'department of food',
    'food and civil supplies',
    'family head',
    'head of family',
    'entitlement details',
    'fair price shop details',
    'fps id',
    'family members',
  ].includes(term))

  const score =
    (positive.count * 0.24) +
    (strongRationSignals ? 0.28 : 0) +
    (adminSignals ? 0.15 : 0) +
    (fileHints.count > 0 ? 0.08 : 0) -
    (hardNegative.count * 0.35) -
    (softNegative.count > 0 && positive.count === 0 ? 0.12 : 0)

  const confidence = Math.max(0, Math.min(0.98, score))

  if (positive.count >= 2 && strongRationSignals && hardNegative.count === 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Ration card keywords detected.',
      detectedType: 'ration_card',
      positive,
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  if (positive.count >= 3 && hardNegative.count === 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Document text matches a ration card pattern.',
      detectedType: 'ration_card',
      positive,
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  if (hardNegative.count > 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence,
      reason: `Text matches other document type keywords: ${hardNegative.found.slice(0, 3).join(', ')}`,
      detectedType: inferDocumentType(normalized),
      positive,
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  if (positive.count >= 2 && softNegative.count > 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Ration card keywords detected, and Aadhaar text is allowed on genuine ration cards.',
      detectedType: 'ration_card',
      positive,
      negative: { ...hardNegative, soft: softNegative },
    }
  }

  return {
    status: 'invalid',
    isValid: false,
    confidence,
    reason: 'Required ration card keywords were not found.',
    detectedType: 'unknown',
    positive,
    negative: { ...hardNegative, soft: softNegative },
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

async function runOptionalOpenAiAadhaarCheck(extractedText) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || String(process.env.ENABLE_OPENAI_AADHAAR_CHECK || '').toLowerCase() !== 'true') {
    return null
  }

  const model = process.env.OPENAI_AADHAAR_MODEL || 'gpt-4.1-mini'
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You validate Indian identity documents. Return only strict JSON with keys is_aadhaar_card, confidence, reason. Answer based only on the extracted text.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Is this text from an Aadhaar card document?\n\nExtracted text:\n${extractedText}\n\nReturn JSON only.`
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
    throw new Error(`OpenAI Aadhaar validation failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  const outputText = extractOpenAiOutputText(data)
  if (!outputText) return null

  try {
    const parsed = JSON.parse(outputText)
    return {
      is_aadhaar_card: Boolean(parsed.is_aadhaar_card),
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

function classifyAadhaarText(text) {
  const normalized = normalizeText(text)
  const fraud = countMatches(normalized, AADHAAR_FRAUD_TERMS)
  const keyMatches = countMatches(normalized, AADHAAR_KEY_TERMS)
  const aadhaarNumberMatch = String(text || '').match(AADHAAR_NUMBER_REGEX)
  const optionalFields = countMatches(normalized, ['dob', 'date of birth', 'male', 'female', 'address'])

  if (!String(text || '').trim() || String(text || '').trim().length < 30) {
    return {
      status: 'retry',
      isValid: false,
      confidence: 0.05,
      reason: 'OCR text is too short or unreadable. Please upload a clearer image or searchable PDF.',
      detectedType: 'unknown',
      positive: keyMatches,
      negative: fraud,
      aadhaarNumber: null,
      optionalFields,
    }
  }

  if (fraud.count > 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.05,
      reason: `Text matches other document type keywords: ${fraud.found.slice(0, 3).join(', ')}`,
      detectedType: inferDocumentType(normalized),
      positive: keyMatches,
      negative: fraud,
      aadhaarNumber: null,
      optionalFields,
    }
  }

  if (!aadhaarNumberMatch) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.2,
      reason: 'Aadhaar number pattern not found.',
      detectedType: 'unknown',
      positive: keyMatches,
      negative: fraud,
      aadhaarNumber: null,
      optionalFields,
    }
  }

  if (keyMatches.count < 2) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.35,
      reason: 'At least two Aadhaar keywords were not found.',
      detectedType: 'unknown',
      aadhaarNumber: aadhaarNumberMatch[0],
      positive: keyMatches,
      negative: fraud,
      optionalFields,
    }
  }

  const baseConfidence = Math.max(
    0,
    Math.min(
      0.99,
      (aadhaarNumberMatch ? 0.4 : 0) +
      (keyMatches.count * 0.2) +
      (optionalFields.count > 0 ? 0.1 : 0) -
      (fraud.count * 0.45)
    )
  )

  if (keyMatches.count >= 2 && fraud.count === 0) {
    return {
      status: 'valid',
      isValid: true,
      confidence: baseConfidence,
      reason: 'Aadhaar keywords and number pattern detected.',
      detectedType: 'aadhaar_card',
      aadhaarNumber: aadhaarNumberMatch[0],
      positive: keyMatches,
      negative: fraud,
      optionalFields,
    }
  }

  return {
    status: 'invalid',
    isValid: false,
    confidence: baseConfidence,
    reason: 'Required Aadhaar keywords were not found.',
    detectedType: 'unknown',
    aadhaarNumber: aadhaarNumberMatch[0],
    positive: keyMatches,
    negative: fraud,
    optionalFields,
  }
}

async function validateAadhaarFile(file) {
  if (!file) {
    return {
      isValid: false,
      status: 'invalid',
      reason: 'No file uploaded',
      confidence: 0,
      detectedType: 'unknown',
      extractedText: '',
      extractedTextPreview: '',
      aadhaarNumber: null,
    }
  }

  const extractedText = await extractTextFromFile(file)
  let heuristic = classifyAadhaarText(extractedText)
  const ai = await runOptionalOpenAiAadhaarCheck(extractedText).catch(() => null)

  if (ai && typeof ai.is_aadhaar_card === 'boolean') {
    const aiConfidence = Number(ai.confidence || 0)
    if (ai.is_aadhaar_card && aiConfidence >= 0.6 && heuristic.status !== 'invalid') {
      heuristic = {
        ...heuristic,
        status: 'valid',
        isValid: true,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || heuristic.reason,
        aiAnalysis: ai,
      }
    } else if (!ai.is_aadhaar_card && aiConfidence >= 0.75) {
      heuristic = {
        ...heuristic,
        status: 'invalid',
        isValid: false,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || 'AI model did not identify this as an Aadhaar card.',
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

function classifyBloodReportText(text) {
  const normalized = normalizeText(text)
  const medical = countMatches(normalized, BLOOD_MEDICAL_TERMS)
  const lab = countMatches(normalized, BLOOD_LAB_TERMS)
  const strongHeader = countMatches(normalized, BLOOD_STRONG_HEADER_TERMS)
  const fraud = countMatches(normalized, BLOOD_FRAUD_TERMS)
  const numericMatches = String(text || '').match(BLOOD_NUMERIC_REGEX) || []
  const tableMatches = String(text || '').match(BLOOD_TABLE_ROW_REGEX) || []
  const lineCount = String(text || '').split(/\r?\n/).filter(Boolean).length
  const length = normalized.length

  if (!length || length < 30) {
    return {
      status: 'retry',
      isValid: false,
      confidence: 0.05,
      reason: 'OCR text is too short or unreadable. Please upload a clearer image or searchable PDF.',
      detectedType: 'unknown',
      positive: medical,
      negative: fraud,
      numericMatches: [],
      tableMatches: [],
      labMatches: lab,
    }
  }

  if (fraud.count > 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.05,
      reason: `Text matches other document type keywords: ${fraud.found.slice(0, 3).join(', ')}`,
      detectedType: 'other_document',
      positive: medical,
      negative: fraud,
      numericMatches,
      tableMatches,
      labMatches: lab,
    }
  }

  const hasLabContext = lab.count > 0
  const hasStrongBloodContext = strongHeader.count >= 2 || (strongHeader.count >= 1 && medical.count >= 2)
  const hasEnoughMedicalTerms = medical.count >= 3 || (hasStrongBloodContext && medical.count >= 2)
  const hasEnoughNumericValues = numericMatches.length >= 2
  const hasTableLikeStructure = tableMatches.length >= 2 || lineCount >= 8
  const looksLikeLabSheet = hasTableLikeStructure || strongHeader.count >= 1
  const hasRequiredContext = hasLabContext || strongHeader.count >= 1 || looksLikeLabSheet
  const confidence = Math.max(
    0,
    Math.min(
      0.99,
      (medical.count * 0.18) +
      (strongHeader.count * 0.12) +
      (hasLabContext ? 0.18 : 0) +
      (hasEnoughNumericValues ? 0.22 : 0) +
      (hasTableLikeStructure ? 0.18 : 0) -
      (fraud.count * 0.4)
    )
  )

  if (hasEnoughMedicalTerms && hasEnoughNumericValues && hasRequiredContext) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Blood report keywords and lab values detected.',
      detectedType: 'blood_report',
      positive: medical,
      negative: fraud,
      numericMatches,
      tableMatches,
      labMatches: lab,
    }
  }

  return {
    status: 'invalid',
    isValid: false,
    confidence,
    reason: 'Required blood report keywords, lab context, or numeric values were not found.',
    detectedType: 'unknown',
    positive: medical,
    negative: fraud,
    numericMatches,
    tableMatches,
    labMatches: lab,
  }
}

async function runOptionalOpenAiBloodCheck(extractedText) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || String(process.env.ENABLE_OPENAI_BLOOD_REPORT_CHECK || '').toLowerCase() !== 'true') {
    return null
  }

  const model = process.env.OPENAI_BLOOD_REPORT_MODEL || 'gpt-4.1-mini'
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You validate medical documents. Return only strict JSON with keys is_blood_report, confidence, reason. Answer based only on the extracted text.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Is this text from a blood test report?\n\nExtracted text:\n${extractedText}\n\nReturn JSON only.`
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
    throw new Error(`OpenAI blood validation failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  const outputText = extractOpenAiOutputText(data)
  if (!outputText) return null

  try {
    const parsed = JSON.parse(outputText)
    return {
      is_blood_report: Boolean(parsed.is_blood_report),
      confidence: Number(parsed.confidence || 0),
      reason: String(parsed.reason || ''),
    }
  } catch (err) {
    return null
  }
}

async function validateBloodReportFile(file) {
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
  let heuristic = classifyBloodReportText(extractedText)
  const ai = await runOptionalOpenAiBloodCheck(extractedText).catch(() => null)

  if (ai && typeof ai.is_blood_report === 'boolean') {
    const aiConfidence = Number(ai.confidence || 0)
    if (ai.is_blood_report && aiConfidence >= 0.6 && heuristic.status !== 'invalid') {
      heuristic = {
        ...heuristic,
        status: 'valid',
        isValid: true,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || heuristic.reason,
        aiAnalysis: ai,
      }
    } else if (!ai.is_blood_report && aiConfidence >= 0.75) {
      heuristic = {
        ...heuristic,
        status: 'invalid',
        isValid: false,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || 'AI model did not identify this as a blood report.',
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

function classifyFitnessCertificateText(text) {
  const normalized = normalizeText(text)
  const core = countMatches(normalized, FITNESS_CORE_TERMS)
  const doctor = countMatches(normalized, FITNESS_DOCTOR_TERMS)
  const patient = countMatches(normalized, FITNESS_PATIENT_TERMS)
  const meta = countMatches(normalized, FITNESS_DATE_SIGNATURE_TERMS)
  const fraud = countMatches(normalized, FITNESS_FRAUD_TERMS)
  const length = normalized.length

  if (!length || length < 25) {
    return {
      status: 'retry',
      isValid: false,
      confidence: 0.05,
      reason: 'OCR text is too short or unreadable. Please upload a clearer fitness certificate image or searchable PDF.',
      detectedType: 'unknown',
      positive: core,
      doctor,
      patient,
      meta,
      negative: fraud,
    }
  }

  if (fraud.count > 0) {
    return {
      status: 'invalid',
      isValid: false,
      confidence: 0.05,
      reason: `Text matches other document type keywords: ${fraud.found.slice(0, 3).join(', ')}`,
      detectedType: 'other_document',
      positive: core,
      doctor,
      patient,
      meta,
      negative: fraud,
    }
  }

  const hasEnoughCore = core.count >= 2
  const hasDoctor = doctor.count >= 1
  const hasPatient = patient.count >= 1
  const hasMeta = meta.count >= 1
  const confidence = Math.max(
    0,
    Math.min(
      0.99,
      (core.count * 0.22) +
      (doctor.count * 0.16) +
      (patient.count * 0.14) +
      (hasMeta ? 0.16 : 0) -
      (fraud.count * 0.45)
    )
  )

  if (hasEnoughCore && hasDoctor && hasPatient && hasMeta) {
    return {
      status: 'valid',
      isValid: true,
      confidence,
      reason: 'Fitness certificate keywords and authority details detected.',
      detectedType: 'fitness_certificate',
      positive: core,
      doctor,
      patient,
      meta,
      negative: fraud,
    }
  }

  return {
    status: 'invalid',
    isValid: false,
    confidence,
    reason: 'Required fitness certificate keywords, doctor details, patient details, or date/signature indicators were not found.',
    detectedType: 'unknown',
    positive: core,
    doctor,
    patient,
    meta,
    negative: fraud,
  }
}

async function runOptionalOpenAiFitnessCheck(extractedText) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || String(process.env.ENABLE_OPENAI_FITNESS_CERT_CHECK || '').toLowerCase() !== 'true') {
    return null
  }

  const model = process.env.OPENAI_FITNESS_CERT_MODEL || 'gpt-4.1-mini'
  const payload = {
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You validate medical certificates. Return only strict JSON with keys is_fitness_certificate, confidence, reason. Answer based only on the extracted text.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Is this text from a fitness certificate issued by a doctor?\n\nExtracted text:\n${extractedText}\n\nReturn JSON only.`
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
    throw new Error(`OpenAI fitness validation failed: ${resp.status} ${detail}`)
  }

  const data = await resp.json()
  const outputText = extractOpenAiOutputText(data)
  if (!outputText) return null

  try {
    const parsed = JSON.parse(outputText)
    return {
      is_fitness_certificate: Boolean(parsed.is_fitness_certificate),
      confidence: Number(parsed.confidence || 0),
      reason: String(parsed.reason || ''),
    }
  } catch (err) {
    return null
  }
}

async function validateFitnessCertificateFile(file) {
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
  let heuristic = classifyFitnessCertificateText(extractedText)
  const ai = await runOptionalOpenAiFitnessCheck(extractedText).catch(() => null)

  if (ai && typeof ai.is_fitness_certificate === 'boolean') {
    const aiConfidence = Number(ai.confidence || 0)
    if (ai.is_fitness_certificate && aiConfidence >= 0.6 && heuristic.status !== 'invalid') {
      heuristic = {
        ...heuristic,
        status: 'valid',
        isValid: true,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || heuristic.reason,
        aiAnalysis: ai,
      }
    } else if (!ai.is_fitness_certificate && aiConfidence >= 0.75) {
      heuristic = {
        ...heuristic,
        status: 'invalid',
        isValid: false,
        confidence: Math.max(heuristic.confidence, aiConfidence),
        reason: ai.reason || 'AI model did not identify this as a fitness certificate.',
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
  validateFitnessCertificateFile,
  validateBloodReportFile,
  validateAadhaarFile,
  validateRationCardFile,
}
