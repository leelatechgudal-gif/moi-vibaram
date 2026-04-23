require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const transactionRoutes = require('./routes/transactions');
const webauthnRoutes = require('./routes/webauthn');

const app = express();

// Security Headers
app.use(helmet());

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

// CORS
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Body parsers — limit to 1mb to prevent payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static uploads (no directory listing)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/events', apiLimiter, eventRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/webauthn', authLimiter, webauthnRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'MOI VIBARAM API' }));

// Global error handler — never leak internal error details to clients
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(err.status || 500).json({ message: 'An internal server error occurred.' });
});

// Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(process.env.PORT, () => {
            console.log(`🚀 MOI VIBARAM Server running on port ${process.env.PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
