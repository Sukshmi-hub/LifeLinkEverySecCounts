import express from 'express'
import multer from 'multer'
import { validateAadhaarFile, validateBloodReportFile, validateFitnessCertificateFile, validateRationCardFile } from '../utils/rationCardValidation.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/validate-ration-card', upload.single('document'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        isValid: false,
        status: 'invalid',
        message: 'Please upload a ration card image or PDF.',
      })
    }

    const result = await validateRationCardFile(file)

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      ...result,
      message: result.reason,
    })
  } catch (err) {
    console.error('validate-ration-card error:', err)
    const message = err && err.message ? err.message : 'Failed to validate document'
    const retry = /ocr|read|parse|tesseract|pdf/i.test(message)
    return res.status(400).json({
      success: false,
      isValid: false,
      status: retry ? 'retry' : 'invalid',
      message: retry ? 'OCR failed. Please upload a clearer image or searchable PDF.' : message,
    })
  }
})

router.post('/validate-aadhaar', upload.single('document'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        isValid: false,
        status: 'invalid',
        message: 'Please upload an Aadhaar image or PDF.',
      })
    }

    const result = await validateAadhaarFile(file)

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      ...result,
      message: result.reason,
    })
  } catch (err) {
    console.error('validate-aadhaar error:', err)
    const message = err && err.message ? err.message : 'Failed to validate document'
    const retry = /ocr|read|parse|tesseract|pdf/i.test(message)
    return res.status(400).json({
      success: false,
      isValid: false,
      status: retry ? 'retry' : 'invalid',
      message: retry ? 'OCR failed. Please upload a clearer image or searchable PDF.' : message,
    })
  }
})

router.post('/validate-blood-report', upload.single('document'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        isValid: false,
        status: 'invalid',
        message: 'Please upload a blood report image or PDF.',
      })
    }

    const result = await validateBloodReportFile(file)

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      ...result,
      message: result.reason,
    })
  } catch (err) {
    console.error('validate-blood-report error:', err)
    const message = err && err.message ? err.message : 'Failed to validate document'
    const retry = /ocr|read|parse|tesseract|pdf/i.test(message)
    return res.status(400).json({
      success: false,
      isValid: false,
      status: retry ? 'retry' : 'invalid',
      message: retry ? 'OCR failed. Please upload a clearer image or searchable PDF.' : message,
    })
  }
})

router.post('/validate-fitness-certificate', upload.single('document'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        isValid: false,
        status: 'invalid',
        message: 'Please upload a fitness certificate image or PDF.',
      })
    }

    const result = await validateFitnessCertificateFile(file)

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      ...result,
      message: result.reason,
    })
  } catch (err) {
    console.error('validate-fitness-certificate error:', err)
    const message = err && err.message ? err.message : 'Failed to validate document'
    const retry = /ocr|read|parse|tesseract|pdf/i.test(message)
    return res.status(400).json({
      success: false,
      isValid: false,
      status: retry ? 'retry' : 'invalid',
      message: retry ? 'OCR failed. Please upload a clearer image or searchable PDF.' : message,
    })
  }
})

export default router
