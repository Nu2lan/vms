import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appeal'
    },
    type: {
        type: String,
        enum: ['before', 'after', 'other'],
        required: true
    }
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema);
export default Media;
