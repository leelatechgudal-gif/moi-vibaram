const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../utils/email');

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
        if (existing) return res.status(409).json({ message: 'Email already registered' });

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

        res.status(201).json({ token: accessToken, refreshToken, user: { _id: user._id, name, email, mobile, location, street, qrCode, role: user.role, tenantId: user.tenantId, tenantRole: user.tenantRole } });
    } catch (err) {
        console.error('[register]', err);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password, forceLogout } = req.body;
        const user = await User.findOne({ email, isDeleted: { $ne: true } });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

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
                user.activeSessions = []; // Clear all other sessions
            } else {
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

        res.json({
            token: accessToken,
            refreshToken,
            user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, location: user.location, qrCode: user.qrCode, role: user.role, tenantId: user.tenantId, tenantRole: user.tenantRole }
        });
    } catch (err) {
        console.error('[login]', err);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            const otp = generateOTP();
            user.otpCode = otp;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await user.save();
            await sendOTPEmail(email, otp);
        }

        // Always return the same message to prevent user enumeration
        res.json({ message: 'If an account with that email exists, an OTP has been sent.' });
    } catch (err) {
        console.error('[forgot-password]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        const user = await User.findOne({ email });
        // Use a generic error to prevent user enumeration
        if (!user || !user.otpCode) return res.status(400).json({ message: 'Invalid or expired OTP.' });

        // Constant-time comparison to prevent timing attacks
        const otpMatch = crypto.timingSafeEqual(
            Buffer.from(String(user.otpCode)),
            Buffer.from(String(otp))
        );
        if (!otpMatch) return res.status(400).json({ message: 'Invalid or expired OTP.' });
        if (new Date() > user.otpExpiry) return res.status(400).json({ message: 'Invalid or expired OTP.' });

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        user.otpCode = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('[verify-otp]', err);
        res.status(500).json({ message: 'Reset failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
            } catch (e) {}
            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user) {
                    // "whenever logs our reset the activeSeasion in User modal"
                    user.activeSessions = [];
                    await user.save();
                }
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('[logout]', err);
        res.status(500).json({ message: 'Logout failed.' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.activeSessions || !user.activeSessions.includes(refreshToken)) {
            return res.status(401).json({ message: 'Session invalidated. Please login again.' });
        }

        const newAccessToken = jwt.sign({ userId: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
        const newRefreshToken = jwt.sign({ userId: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

        // Rotate the refresh token
        user.activeSessions = user.activeSessions.filter(t => t !== refreshToken);
        user.activeSessions.push(newRefreshToken);
        await user.save();

        res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error('[refresh]', err);
        res.status(500).json({ message: 'Token refresh failed.' });
    }
});

module.exports = router;
