import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
    gps_confidence: { type: Number },
    visual_landmarks: [{ type: String }],
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    }
}, { _id: false });

const ConfidenceScoresSchema = new mongoose.Schema({
    description: { type: Number },
    category: { type: Number },
    priority: { type: Number }
}, { _id: false });

const VerificationSchema = new mongoose.Schema({
    same_location: { type: Boolean },
    issue_resolved: { type: Boolean },
    is_ai_generated: { type: Boolean },
    ai_detection_reason: { type: String },
    mismatch_warning: { type: Boolean },
    confidence: { type: Number },
    verifiedAt: { type: Date },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }
}, { _id: false });

const appealSchema = new mongoose.Schema({
    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    initialMediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending Review', 'Resolved', 'Mismatch - Return Back', 'Rejected'],
        default: 'Pending Review'
    },
    // Gemini AI Analyzed fields
    title: { type: String },
    description: { type: String },
    category: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    location: LocationSchema,
    confidence_scores: ConfidenceScoresSchema,

    // Resolution details
    verification: VerificationSchema,
    rejectionReason: { type: String }
}, { timestamps: true });

const Appeal = mongoose.model('Appeal', appealSchema);
export default Appeal;
