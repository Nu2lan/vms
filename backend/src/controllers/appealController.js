import fs from 'fs';
import path from 'path';
import exifr from 'exifr';
import Appeal from '../models/Appeal.js';
import Media from '../models/Media.js';
import { analyzeAppealMedia, verifyResolutionMedia } from '../services/mediaService.js';

// @route   POST /api/appeals/analyze
// @desc    Upload media and get AI analysis (Preview before submitting)
// @access  Private
export const analyzeAppeal = async (req, res) => {
    try {
        if (!req.file) {
            return res.sendError(400, 'ERR_NO_FILE', 'Please upload a file');
        }

        let aiResult;
        try {
            aiResult = await analyzeAppealMedia(req.file.path, req.file.mimetype);
        } catch (aiError) {
            // Clean up uploaded file if AI analysis fails (Issue #7)
            try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
            throw aiError;
        }

        // Attempt EXIF GPS extraction
        let gpsCoords = null;
        try {
            const buffer = fs.readFileSync(req.file.path);
            const exifData = await exifr.gps(buffer);
            if (exifData && exifData.latitude && exifData.longitude) {
                gpsCoords = { lat: exifData.latitude, lng: exifData.longitude };
            }
        } catch (err) {
            console.warn("EXIF extraction skipped/failed:", err.message);
        }

        // Fallback to coordinates provided via req.body (from HTML5 Geolocation)
        if (!gpsCoords && req.body.latitude && req.body.longitude) {
            gpsCoords = {
                lat: parseFloat(req.body.latitude),
                lng: parseFloat(req.body.longitude)
            };
        }

        // Merge coordinates into AI result location
        if (gpsCoords) {
            aiResult.location = {
                ...aiResult.location,
                coordinates: gpsCoords
            };
        }

        // Save temporary media record (or just return the path for final submission)
        const media = await Media.create({
            originalName: req.file.originalname,
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user.id,
            type: 'before'
        });

        return res.sendSuccess({
            aiAnalysis: aiResult,
            mediaId: media._id
        });
    } catch (error) {
        console.error(error);
        return res.sendError(500, 'ERR_AI_ANALYSIS_FAILED', error.message);
    }
};

// @route   POST /api/appeals
// @desc    Submit finalized appeal
// @access  Private
export const submitAppeal = async (req, res) => {
    try {
        const { mediaId, aiAnalysis } = req.body;

        if (!mediaId || !aiAnalysis) {
            return res.sendError(400, 'ERR_INVALID_DATA', 'Missing required appeal data');
        }

        const appeal = await Appeal.create({
            citizenId: req.user.id,
            initialMediaId: mediaId,
            status: 'Pending Review',
            title: aiAnalysis.title,
            description: aiAnalysis.description,
            category: aiAnalysis.category,
            priority: aiAnalysis.priority,
            location: aiAnalysis.location,
            confidence_scores: aiAnalysis.confidence_scores
        });

        // Update media record to link to this appeal
        await Media.findByIdAndUpdate(mediaId, { appealId: appeal._id });

        return res.sendSuccess({ appeal });
    } catch (error) {
        console.error(error);
        return res.sendError(500, 'ERR_APPEAL_CREATION_FAILED', error.message);
    }
};

// @route   GET /api/appeals
// @desc    Get all active appeals (For Admins) or user's appeals (For Citizens)
// @access  Private
export const getAppeals = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'citizen') {
            query.citizenId = req.user.id;
        }

        // Pagination (Issue #13)
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [appeals, total] = await Promise.all([
            Appeal.find(query)
                .populate('citizenId', 'firstName lastName email')
                .populate('initialMediaId', 'url')
                .populate('verification.resolutionMediaId', 'url')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Appeal.countDocuments(query)
        ]);

        return res.sendSuccess({
            appeals,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.sendError(500, 'ERR_FETCH_FAILS', error.message);
    }
};

// @route   GET /api/appeals/:id
// @desc    Get a single appeal by ID
// @access  Private
export const getAppealById = async (req, res) => {
    try {
        const appeal = await Appeal.findById(req.params.id)
            .populate('citizenId', 'firstName lastName email')
            .populate('initialMediaId', 'url')
            .populate('verification.resolutionMediaId', 'url');

        if (!appeal) {
            return res.sendError(404, 'ERR_NOT_FOUND', 'Appeal not found');
        }

        if (req.user.role === 'citizen' && appeal.citizenId._id.toString() !== req.user.id.toString()) {
            return res.sendError(403, 'ERR_FORBIDDEN', 'Not authorized to view this appeal');
        }

        return res.sendSuccess({ appeal });
    } catch (error) {
        return res.sendError(500, 'ERR_FETCH_FAILS', error.message);
    }
};

// @route   PUT /api/appeals/:id
// @desc    Update appeal details (admin only)
// @access  Private/Admin
export const updateAppeal = async (req, res) => {
    try {
        const { title, description, category, priority, status, rejectionReason } = req.body;

        const appeal = await Appeal.findById(req.params.id);
        if (!appeal) {
            return res.sendError(404, 'ERR_NOT_FOUND', 'Appeal not found');
        }

        if (title !== undefined) appeal.title = title;
        if (description !== undefined) appeal.description = description;
        if (category !== undefined) appeal.category = category;
        if (priority !== undefined) appeal.priority = priority;
        if (status !== undefined) appeal.status = status;
        if (rejectionReason !== undefined) appeal.rejectionReason = rejectionReason;

        await appeal.save();

        const updated = await Appeal.findById(appeal._id)
            .populate('citizenId', 'firstName lastName email')
            .populate('initialMediaId', 'url')
            .populate('verification.resolutionMediaId', 'url');

        return res.sendSuccess({ appeal: updated });
    } catch (error) {
        return res.sendError(500, 'ERR_UPDATE_FAILED', error.message);
    }
};
