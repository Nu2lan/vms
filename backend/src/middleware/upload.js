import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
        'video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/x-msvideo',
        'video/x-matroska', 'video/webm', 'video/3gpp', 'video/3gpp2'
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Yalnız şəkil və video faylları qəbul edilir.'), false);
    }
};

export const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit (matches memories.ai API limit)
    },
    fileFilter
});
