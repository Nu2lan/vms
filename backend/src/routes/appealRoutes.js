import express from 'express';
import { upload } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/auth.js';
import { analyzeAppeal, submitAppeal, getAppeals, getAppealById, updateAppeal } from '../controllers/appealController.js';
import { verifyResolution, resolveAppeal } from '../controllers/adminController.js';

const router = express.Router();

router.route('/')
    .get(protect, getAppeals)
    .post(protect, authorize('citizen'), submitAppeal);

router.get('/:id', protect, getAppealById);

router.post('/analyze', protect, authorize('citizen'), upload.single('media'), analyzeAppeal);

router.post('/:id/verify', protect, authorize('admin'), upload.single('resolutionMedia'), verifyResolution);

router.put('/:id', protect, authorize('admin'), updateAppeal);

router.post('/:id/resolve', protect, authorize('admin'), resolveAppeal);

export default router;
