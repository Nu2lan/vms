import Appeal from '../models/Appeal.js';
import Media from '../models/Media.js';
import { verifyResolutionMedia } from '../services/geminiService.js';
import path from 'path';
import exifr from 'exifr';
// @route   POST /api/appeals/:id/verify
// @desc    Admin uploads resolution media and getting AI verification
// @access  Private (Admin only)
export const verifyResolution = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.sendError(403, 'ERR_FORBIDDEN', 'Only admins can verify resolutions');
        }

        if (!req.file) {
            return res.sendError(400, 'ERR_NO_FILE', 'Please upload a resolution graphic');
        }

        const appeal = await Appeal.findById(req.params.id).populate('initialMediaId');
        if (!appeal) return res.sendError(404, 'ERR_NOT_FOUND', 'Appeal not found');

        if (appeal.status !== 'Pending Review') {
            return res.sendError(400, 'ERR_INVALID_STATE', 'Appeal is already resolved or returned');
        }

        const resolutionMediaPath = req.file.path;
        const resolutionMimeType = req.file.mimetype;

        const originalMediaUrl = appeal.initialMediaId.url;
        // Strip "/uploads/" or fetch absolute path depending on hosting:
        const originalMediaPath = path.join(process.cwd(), originalMediaUrl); // use exact absolute path
        const originalMimeType = appeal.initialMediaId.mimeType;

        // Check EXIF metadata of resolution image — AI-generated images lack camera data
        // Skip EXIF check if photo was captured from browser camera (canvas strips EXIF)
        let exifFlaggedAsAI = false;
        const isCameraCapture = req.body.capturedFromCamera === 'true';
        if (!isCameraCapture) {
            try {
                const exifData = await exifr.parse(resolutionMediaPath, { pick: ['Make', 'Model', 'Software', 'DateTimeOriginal'] });
                if (!exifData || (!exifData.Make && !exifData.Model)) {
                    exifFlaggedAsAI = true;
                    console.log('[AI Detection] No camera EXIF data found — likely AI-generated');
                }
            } catch {
                exifFlaggedAsAI = true;
                console.log('[AI Detection] Could not parse EXIF — likely AI-generated');
            }
        }

        // AI comparison
        const verificationResult = await verifyResolutionMedia(
            originalMediaPath, originalMimeType,
            resolutionMediaPath, resolutionMimeType
        );

        // If EXIF check flagged as AI or Gemini detected it, mark as AI-generated
        if (exifFlaggedAsAI || verificationResult.is_ai_generated) {
            verificationResult.is_ai_generated = true;
            verificationResult.issue_resolved = false;
            verificationResult.mismatch_warning = true;
        }

        // Save resolution media record
        const resMedia = await Media.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user.id,
            appealId: appeal._id,
            type: 'after'
        });

        // Update appeal
        appeal.verification = {
            ...verificationResult,
            verifiedAt: new Date(),
            adminId: req.user.id,
            resolutionMediaId: resMedia._id
        };

        // Status remains 'Pending Review' so admin can try again or manually deal with it

        await appeal.save();

        return res.sendSuccess({ appeal });

    } catch (error) {
        console.error(error);
        return res.sendError(500, 'ERR_VERIFICATION_FAILED', error.message);
    }
};

// @route   POST /api/appeals/:id/resolve
// @desc    Admin manually approves and closes a verified appeal
// @access  Private (Admin only)
export const resolveAppeal = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.sendError(403, 'ERR_FORBIDDEN', 'Only admins can resolve appeals');
        }

        const appeal = await Appeal.findById(req.params.id)
            .populate('initialMediaId')
            .populate('verification.resolutionMediaId');

        if (!appeal) return res.sendError(404, 'ERR_NOT_FOUND', 'Appeal not found');

        // Can only manually resolve if the AI already verified it without a mismatch warning
        if (!appeal.verification || appeal.verification.mismatch_warning) {
            return res.sendError(400, 'ERR_INVALID_STATE', 'Appeal must be successfully verified before resolving');
        }

        appeal.status = 'Resolved';
        await appeal.save();

        return res.sendSuccess({ appeal });

    } catch (error) {
        console.error(error);
        return res.sendError(500, 'ERR_RESOLVE_FAILED', error.message);
    }
};
