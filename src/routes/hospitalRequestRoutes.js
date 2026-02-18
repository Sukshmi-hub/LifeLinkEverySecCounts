import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getUserVerificationRequests,
  getPatientOrganRequests,
  getDonorRegistrationRequests,
  approveRequest,
  rejectRequest,
  getPendingRequestsCount,
  createOrganRequest,
} from '../controllers/hospitalRequestController.js';

const router = express.Router();

router.get('/verify', authenticate, getUserVerificationRequests);
router.get('/organ-requests', authenticate, getPatientOrganRequests);
router.get('/donor-requests', authenticate, getDonorRegistrationRequests);
router.get('/pending-count', authenticate, getPendingRequestsCount);
router.put('/:id/approve', authenticate, approveRequest);
router.put('/:id/reject', authenticate, rejectRequest);
router.post('/organ-request', authenticate, createOrganRequest);

export default router;
