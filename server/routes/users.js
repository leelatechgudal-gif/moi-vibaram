const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const User = require('../models/User');
const auth = require('../middleware/auth');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `${req.userId}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
        }
    },
});

// GET /api/users/profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash -otpCode -otpExpiry');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('[users]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// GET /api/users/admin/all
router.get('/admin/all', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' });
        }
        const { page, limit } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await User.countDocuments();
            const users = await User.find().select('-passwordHash -otpCode -otpExpiry -webAuthnCredentials -activeSessions').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
            res.json({
                data: users,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const users = await User.find().select('-passwordHash -otpCode -otpExpiry -webAuthnCredentials -activeSessions').sort({ createdAt: -1 });
            res.json(users);
        }
    } catch (err) {
        console.error('[users]', err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, fatherName, motherName, nickname, spouseName, occupation, location, street, mobile } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        Object.assign(user, { name, fatherName, motherName, nickname, spouseName, occupation, location, street, mobile });

        // Regenerate QR code with updated info
        const qrData = JSON.stringify({ userId: user._id, name: user.name, mobile: user.mobile, location: user.location, street: user.street });
        user.qrCode = await QRCode.toDataURL(qrData);
        await user.save();

        res.json({ message: 'Profile updated', user: { ...user.toObject(), passwordHash: undefined, otpCode: undefined, otpExpiry: undefined } });
    } catch (err) {
        console.error('[users]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// POST /api/users/profile/photo
router.post('/profile/photo', auth, upload.single('photo'), async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.profilePhoto = `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ profilePhoto: user.profilePhoto });
    } catch (err) {
        console.error('[users]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

module.exports = router;
