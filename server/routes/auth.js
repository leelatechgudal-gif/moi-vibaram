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
        const existing = await User.findOne({ email });
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

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.status(201).json({ token, user: { _id: user._id, name, email, mobile, location, street, qrCode } });
    } catch (err) {
        console.error('[register]', err);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.json({
            token,
            user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, location: user.location, qrCode: user.qrCode }
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

module.exports = router;
