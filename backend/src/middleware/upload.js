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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and MP4 are allowed.'), false);
    }
};

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter
});
