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
            const filter = { isDeleted: { $ne: true } };
            const total = await User.countDocuments(filter);
            const users = await User.find(filter).select('-passwordHash -otpCode -otpExpiry -webAuthnCredentials -activeSessions').sort({ createdAt: -1 }).skip(skip).limit(limitNum);
            res.json({
                data: users,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const users = await User.find({ isDeleted: { $ne: true } }).select('-passwordHash -otpCode -otpExpiry -webAuthnCredentials -activeSessions').sort({ createdAt: -1 });
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
        const { name, mobile, themePreference } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (themePreference) {
            user.themePreference = themePreference;
        }

        // Regenerate QR code with updated info
        const qrData = JSON.stringify({ userId: user._id, name: user.name, mobile: user.mobile });
        user.qrCode = await QRCode.toDataURL(qrData);
        await user.save();

        res.json({ message: 'Profile updated', user: { ...user.toObject(), passwordHash: undefined, otpCode: undefined, otpExpiry: undefined } });
    } catch (err) {
        console.error('[users]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// PUT /api/users/profile/theme
router.put('/profile/theme', auth, async (req, res) => {
    try {
        const { themePreference } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (themePreference) {
            user.themePreference = themePreference;
            await user.save();
        }

        res.json({ message: 'Theme updated', themePreference: user.themePreference });
    } catch (err) {
        console.error('[users theme]', err);
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

// POST /api/users/admin
router.post('/admin', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' });
        }

        const { name, mobile, email, password, role, subscriptionExpiry } = req.body;
        
        if (!name || !mobile || !email || !password) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const existingEmail = await User.findOne({ email, isDeleted: { $ne: true } });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 12);
        
        const user = new User({ 
            name, 
            mobile, 
            email, 
            passwordHash, 
            role: role || 'user', 
            subscriptionExpiry 
        });
        await user.save();
        
        res.status(201).json({ message: 'User created successfully', user: { _id: user._id, name, email, mobile, role } });
    } catch (err) {
        console.error('[admin create user]', err);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

// PUT /api/users/admin/:id
router.put('/admin/:id', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' });
        }

        const { name, mobile, email, role, subscriptionExpiry, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email, isDeleted: { $ne: true } });
            if (existingEmail) return res.status(409).json({ message: 'Email already registered.' });
            user.email = email;
        }

        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (role) user.role = role;
        if (subscriptionExpiry !== undefined) user.subscriptionExpiry = subscriptionExpiry ? new Date(subscriptionExpiry) : null;

        if (password) {
            const bcrypt = require('bcryptjs');
            user.passwordHash = await bcrypt.hash(password, 12);
        }

        await user.save();
        res.json({ message: 'User updated successfully', user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
    } catch (err) {
        console.error('[admin update user]', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// DELETE /api/users/admin/:id
router.delete('/admin/:id', auth, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' });
        }

        if (req.params.id === req.userId) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeleted = true;
        await user.save();

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('[admin delete user]', err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

module.exports = router;
