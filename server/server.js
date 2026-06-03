require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const transactionRoutes = require('./routes/transactions');
const partiesRoutes = require('./routes/parties');
const webauthnRoutes = require('./routes/webauthn');
const remindersRoutes = require('./routes/reminders');
const tenantRoutes = require('./routes/tenant');

const app = express();

// Security Headers
app.use(helmet());

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

// CORS
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://192.168.0.125:5173/',
    'http://192.168.0.125:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost',          // Android Capacitor
    'capacitor://localhost',      // iOS Capacitor
    'http://10.0.2.2:5173',       // Android Emulator Live Reload
    'http://10.0.2.2:5001',       // Android Emulator Local API
    'http://10.0.2.2',
    'https://leelatech.co.in',
    'http://leelatech.co.in',
    'https://www.leelatech.co.in',
    'http://www.leelatech.co.in',
].filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

// Helper to check if origin is a local address (localhost, private network, or capacitor/local schemes)
const isLocalOrigin = (origin) => {
    if (!origin) return false;
    // Match localhost or 127.0.0.1 with any port
    if (/^(https?|capacitor):\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
    // Match private IP subnets: 192.168.x.x, 10.x.x.x, 172.16.x.x to 172.31.x.x with any port
    if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || (isDev && isLocalOrigin(origin))) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked request', { origin });
            callback(new Error(`Not allowed by CORS: origin ${origin} is not in allowedOrigins`));
        }
    },
    credentials: true
}));

// Body parsers — limit to 20mb to support bulk uploads and photos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Global string trimming middleware
app.use((req, res, next) => {
    const trimStrings = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(key => {
            if (key.toLowerCase().includes('password')) return; // Never trim passwords
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].trim();
            } else if (typeof obj[key] === 'object') {
                trimStrings(obj[key]);
            }
        });
    };
    if (req.body) trimStrings(req.body);
    if (req.query) trimStrings(req.query);
    next();
});

// HTTP request logger — logs every incoming request on critical paths
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'info';
        logger[level](`${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            ms,
            ip: req.ip,
            userId: req.userId || undefined,
        });
    });
    next();
});

// Static uploads (no directory listing)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/events', apiLimiter, eventRoutes);
app.use('/api/parties', apiLimiter, partiesRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/reminders', apiLimiter, remindersRoutes);
app.use('/api/tenant', apiLimiter, tenantRoutes);
app.use('/api/webauthn', authLimiter, webauthnRoutes);

app.get('/health', (req, res) => {
    logger.debug('Health check hit');
    res.json({ status: 'ok', app: 'MOI VIBARAM API' });
});

// Global error handler — never leak internal error details to clients
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    logger.error('Unhandled server error', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.userId || undefined,
    });
    res.status(err.status || 500).json({ message: 'An internal server error occurred.' });
});

// Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        logger.info('MongoDB connected', { uri: process.env.MONGO_URI?.replace(/\/\/.*@/, '//***@') });
        
        // Auto-migrate role 'user' to 'member' to prevent breaks
        try {
            const User = require('./models/User');
            const result = await User.updateMany({ role: 'user' }, { $set: { role: 'member' } });
            if (result.modifiedCount > 0) {
                logger.info(`Migrated ${result.modifiedCount} users role from 'user' to 'member'.`);
            }
        } catch (migErr) {
            logger.error('Failed to run user role migration', { error: migErr.message });
        }

        const port = process.env.PORT || 5001;
        app.listen(port, () => {
            logger.info(`MOI VIBARAM Server started`, { port, env: process.env.NODE_ENV || 'development' });
        });
    })
    .catch(err => {
        logger.error('MongoDB connection failed', { message: err.message });
        process.exit(1);
    });

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception — shutting down', { message: err.message, stack: err.stack });
    process.exit(1);
});
