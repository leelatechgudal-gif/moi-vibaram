const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../utils/email');
const logger = require('../utils/logger');
const { isWhitelistedAdmin } = require('../utils/admin');

/**
 * Normalizes input identifier to support email or mobile number queries.
 * For mobile numbers, matches exact input, last 10 digits, 91+last 10, or +91+last 10.
 * @param {string} identifier - Email or mobile input from request.
 * @returns {object} Query conditions for Mongoose User.findOne.
 */
const getIdentifierQuery = (identifier) => {
    const trimmed = identifier ? identifier.trim() : '';
    const searchTerms = [trimmed];
    const cleanMobile = trimmed.replace(/\D/g, ''); // keep only digits
    if (cleanMobile.length >= 10) {
        const last10 = cleanMobile.slice(-10);
        searchTerms.push(last10);
        searchTerms.push('91' + last10);
        searchTerms.push('+' + last10);
        searchTerms.push('+91' + last10);
    }
    return {
        $or: [
            { email: trimmed },
            { email: { $in: searchTerms } },
            { mobile: { $in: searchTerms } }
        ]
    };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, mobile, email, password, location, street } = req.body;
        if (!name || !mobile || !email || !password || !location) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }
        const existing = await User.findOne({ email, isDeleted: { $ne: true } });
        if (existing) {
            logger.warn('[register] Email already registered', { email });
            return res.status(409).json({ message: 'Email already registered' });
        }

        // bcrypt cost factor 12 — stronger than minimum
        const passwordHash = await bcrypt.hash(password, 12);
        const user = new User({ name, mobile, email, passwordHash, location, street });
        await user.save();

        // Generate QR code with user info
        const qrData = JSON.stringify({ userId: user._id, name, mobile, location, street });
        const qrCode = await QRCode.toDataURL(qrData);
        user.qrCode = qrCode;
        await user.save();

        const accessToken = jwt.sign({ userId: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
        const refreshToken = jwt.sign({ userId: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

        user.activeSessions = [refreshToken];
        await user.save();

        logger.info('[register] New user registered', { userId: user._id, email, tenantId: user.tenantId });
        const isSuperAdmin = await isWhitelistedAdmin(email);
        res.status(201).json({ token: accessToken, refreshToken, user: { _id: user._id, name, email, mobile, location, street, qrCode, role: user.role, tenantId: user.tenantId, tenantRole: user.tenantRole, isSuperAdmin } });
    } catch (err) {
        logger.error('[register] Registration failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

// Shared helper to generate token session responses
const createSessionAndResponse = async (user, forceLogout, req, res) => {
    let validSessions = [];
    if (user.activeSessions && user.activeSessions.length > 0) {
        // Clean up expired tokens first
        validSessions = user.activeSessions.filter(t => {
            try {
                jwt.verify(t, process.env.JWT_SECRET);
                return true;
            } catch (e) {
                return false;
            }
        });
        user.activeSessions = validSessions;
    }

    if (validSessions.length >= 3) {
        if (forceLogout) {
            logger.info('[login] Force logout — clearing all sessions', { userId: user._id, email: user.email });
            user.activeSessions = []; // Clear all other sessions
        } else {
            logger.warn('[login] Session limit reached', { userId: user._id, email: user.email, sessionCount: validSessions.length });
            return res.status(403).json({ 
                message: 'Maximum 3 logins permitted.', 
                code: 'SESSION_LIMIT_REACHED' 
            });
        }
    }

    const accessToken = jwt.sign({ userId: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    const refreshToken = jwt.sign({ userId: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

    if (!user.activeSessions) user.activeSessions = [];
    user.activeSessions.push(refreshToken);
    await user.save();

    logger.info('[login] User logged in successfully', { userId: user._id, email: user.email, tenantId: user.tenantId, ip: req.ip });
    const isSuperAdmin = await isWhitelistedAdmin(user.email);
    res.json({
        token: accessToken,
        refreshToken,
        user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, location: user.location, qrCode: user.qrCode, role: user.role, tenantId: user.tenantId, tenantRole: user.tenantRole, isSuperAdmin }
    });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password, forceLogout } = req.body;
        const user = await User.findOne({
            email: email ? email.trim() : '',
            isDeleted: { $ne: true }
        });

        if (!user) {
            logger.warn('[login] Invalid credentials — user not found', { email, ip: req.ip });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isActive === false) {
            logger.warn('[login] Login blocked — account deactivated', { email, ip: req.ip });
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact your tenant owner.' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            logger.warn('[login] Invalid credentials — wrong password', { email, ip: req.ip });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await createSessionAndResponse(user, forceLogout, req, res);
    } catch (err) {
        logger.error('[login] Login failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/send-login-otp
router.post('/send-login-otp', async (req, res) => {
    try {
        const { email } = req.body; // Can be email or mobile
        if (!email) {
            return res.status(400).json({ message: 'Email or Mobile number is required' });
        }
        
        const user = await User.findOne({
            ...getIdentifierQuery(email),
            isDeleted: { $ne: true }
        });

        if (!user) {
            logger.warn('[send-login-otp] User not found', { identifier: email });
            return res.status(404).json({ message: 'User not found with this email/mobile number.' });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact your tenant owner.' });
        }

        const otp = generateOTP();
        user.otpCode = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        if (email.includes('@')) {
            await sendOTPEmail(user.email, otp);
            logger.info('[send-login-otp] Email OTP sent', { email: user.email });
        } else {
            const { sendSMS } = require('../utils/sms');
            await sendSMS(user.mobile, otp);
            logger.info('[send-login-otp] Mobile OTP sent', { mobile: user.mobile });
        }

        res.json({ message: 'OTP sent successfully.' });
    } catch (err) {
        logger.error('[send-login-otp] Failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
});

// POST /api/auth/login-otp
router.post('/login-otp', async (req, res) => {
    try {
        const { email, otp, forceLogout } = req.body; // email can be email or mobile
        if (!email || !otp) {
            return res.status(400).json({ message: 'Identifier and OTP code are required.' });
        }

        const user = await User.findOne({
            ...getIdentifierQuery(email),
            isDeleted: { $ne: true }
        });

        if (!user) {
            logger.warn('[login-otp] User not found', { identifier: email });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact your tenant owner.' });
        }

        if (!user.otpCode || new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'OTP expired or not requested. Please request a new OTP.' });
        }

        const otpMatch = crypto.timingSafeEqual(
            Buffer.from(String(user.otpCode)),
            Buffer.from(String(otp))
        );
        if (!otpMatch) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // Clear OTP after successful verify
        user.otpCode = undefined;
        user.otpExpiry = undefined;

        await createSessionAndResponse(user, forceLogout, req, res);
    } catch (err) {
        logger.error('[login-otp] Login failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body; // Can be email or mobile
        const user = await User.findOne({
            ...getIdentifierQuery(email),
            isDeleted: { $ne: true }
        });

        if (user) {
            const otp = generateOTP();
            user.otpCode = otp;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await user.save();

            if (email.includes('@')) {
                await sendOTPEmail(user.email, otp);
            } else {
                const { sendSMS } = require('../utils/sms');
                await sendSMS(user.mobile, otp);
            }
            logger.info('[forgot-password] OTP sent', { email: user.email, mobile: user.mobile });
        } else {
            logger.debug('[forgot-password] Identifier not found (silent)', { email });
        }

        // Always return the same message to prevent user enumeration
        res.json({ message: 'If the account exists, an OTP has been sent.' });
    } catch (err) {
        logger.error('[forgot-password] Failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body; // email can be email or mobile

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        const user = await User.findOne({
            ...getIdentifierQuery(email),
            isDeleted: { $ne: true }
        });

        // Use a generic error to prevent user enumeration
        if (!user || !user.otpCode) {
            logger.warn('[verify-otp] OTP not found or user missing', { email });
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        // Constant-time comparison to prevent timing attacks
        const otpMatch = crypto.timingSafeEqual(
            Buffer.from(String(user.otpCode)),
            Buffer.from(String(otp))
        );
        if (!otpMatch) {
            logger.warn('[verify-otp] OTP mismatch', { email });
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        if (new Date() > user.otpExpiry) {
            logger.warn('[verify-otp] OTP expired', { email });
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        user.otpCode = undefined;
        user.otpExpiry = undefined;
        await user.save();

        logger.info('[verify-otp] Password reset successful', { email });
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        logger.error('[verify-otp] Failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Reset failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            } catch (e) {}
            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.activeSessions) {
                    user.activeSessions = user.activeSessions.filter(t => t !== refreshToken);
                    await user.save();
                    logger.info('[logout] Session cleared successfully', { userId: decoded.userId });
                }
            }
        } else {
            // Fallback: clear all sessions for the user if no refresh token is provided
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
                } catch (e) {}
                if (decoded) {
                    const user = await User.findById(decoded.userId);
                    if (user) {
                        user.activeSessions = [];
                        await user.save();
                        logger.info('[logout] All user sessions cleared (fallback)', { userId: decoded.userId });
                    }
                }
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        logger.error('[logout] Logout failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Logout failed.' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn('[refresh] No refresh token provided', { ip: req.ip });
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            logger.warn('[refresh] Invalid or expired refresh token', { ip: req.ip, error: err.message });
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        if (decoded.type !== 'refresh') {
            logger.warn('[refresh] Wrong token type', { userId: decoded.userId, type: decoded.type });
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.activeSessions || !user.activeSessions.includes(refreshToken)) {
            logger.warn('[refresh] Refresh token not in active sessions — possible theft or logout', { userId: decoded.userId });
            return res.status(401).json({ message: 'Session invalidated. Please login again.' });
        }

        const newAccessToken = jwt.sign({ userId: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
        const newRefreshToken = jwt.sign({ userId: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

        // Rotate the refresh token
        user.activeSessions = user.activeSessions.filter(t => t !== refreshToken);
        user.activeSessions.push(newRefreshToken);
        await user.save();

        logger.debug('[refresh] Token rotated successfully', { userId: user._id });
        res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        logger.error('[refresh] Token refresh failed', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Token refresh failed.' });
    }
});

module.exports = router;
