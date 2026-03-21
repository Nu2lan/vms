import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import authRoutes from './src/routes/authRoutes.js';
import appealRoutes from './src/routes/appealRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — whitelist allowed origins (Issue #3)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

// Input sanitization — prevent NoSQL injection (Issue #5)
// Custom sanitizer (express-mongo-sanitize is incompatible with Express 5's read-only req.query)
function sanitizeObject(obj) {
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else {
                sanitizeObject(obj[key]);
            }
        }
    }
    return obj;
}
app.use((req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.params) sanitizeObject(req.params);
    next();
});

// Rate limiting — global (Issue #4)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: { code: 'ERR_RATE_LIMIT', message: 'Too many requests, please try again later.' } }
});
app.use(globalLimiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 auth attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: { code: 'ERR_RATE_LIMIT', message: 'Too many login attempts, please try again later.' } }
});

// Standard API Response Wrapper Middleware
app.use((req, res, next) => {
    res.sendSuccess = (data) => {
        res.json({
            success: true,
            data,
            error: null,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || crypto.randomUUID()
            }
        });
    };

    res.sendError = (statusCode, code, message) => {
        res.status(statusCode).json({
            success: false,
            data: null,
            error: { code, message },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || crypto.randomUUID()
            }
        });
    };
    next();
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/appeals', appealRoutes);

app.get('/api/health', (req, res) => {
    res.sendSuccess({ status: 'API is running', version: '1.0.0' });
});

// 404 Handler
app.use((req, res) => {
    const statusCode = 404;
    const body = {
        success: false,
        data: null,
        error: { code: 'ERR_NOT_FOUND', message: 'Route not found' },
        meta: { timestamp: new Date().toISOString() }
    };
    res.status(statusCode).json(body);
});

// Global Error Handler — uses res.status().json() directly for robustness
// (res.sendError may not exist if error occurs before response wrapper middleware)
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const body = {
        success: false,
        data: null,
        error: { code: err.code || 'ERR_INTERNAL_SERVER', message: err.message || 'Internal Server Error' },
        meta: { timestamp: new Date().toISOString() }
    };
    res.status(statusCode).json(body);
});

const PORT = process.env.PORT || 5000;

// Start server immediately so health check passes
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aiasan')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });

