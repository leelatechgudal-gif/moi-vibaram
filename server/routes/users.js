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
        const { name, fatherName, motherName, nickname, spouseName, occupation, location, street, mobile, themePreference } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        Object.assign(user, { name, fatherName, motherName, nickname, spouseName, occupation, location, street, mobile });
        if (themePreference) {
            user.themePreference = themePreference;
        }

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

        const { name, mobile, email, password, role, location, subscriptionExpiry } = req.body;
        
        if (!name || !mobile || !email || !password) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const existingNamePhone = await User.findOne({ name, mobile });
        if (existingNamePhone) {
            return res.status(409).json({ message: 'User with this Name and Phone number already exists.' });
        }

        const existingEmail = await User.findOne({ email });
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
            location: location || 'Unknown',
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

        const { name, mobile, email, role, location, subscriptionExpiry, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name && mobile) {
            const existingNamePhone = await User.findOne({ name, mobile, _id: { $ne: user._id } });
            if (existingNamePhone) {
                return res.status(409).json({ message: 'User with this Name and Phone number already exists.' });
            }
        }

        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) return res.status(409).json({ message: 'Email already registered.' });
            user.email = email;
        }

        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (role) user.role = role;
        if (location) user.location = location;
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

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('[admin delete user]', err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// GET /api/users - Get all contacts (parties)
router.get('/', auth, async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const filter = { role: { $in: ['party', 'user'] } };
        
        if (search) {
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const safeQ = escapeRegex(search);
            filter.$or = [
                { name: new RegExp(safeQ, 'i') },
                { mobile: new RegExp(safeQ, 'i') },
                { location: new RegExp(safeQ, 'i') }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await User.countDocuments(filter);
            const users = await User.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum);
            res.json({
                data: users,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const users = await User.find(filter).sort({ name: 1 });
            res.json(users);
        }
    } catch (err) {
        console.error('[users get]', err);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// POST /api/users - Create a new contact (party)
router.post('/', auth, async (req, res) => {
    try {
        const { partyName, name, mobile, ...rest } = req.body;
        const finalName = name || partyName;
        if (!finalName) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Check for unique Name and Phone combination
        const mobileToSave = mobile || '';
        const existing = await User.findOne({ name: finalName, mobile: mobileToSave });
        if (existing) {
            return res.status(409).json({ message: 'A user with this Name and Phone number already exists.' });
        }

        const userObj = new User({
            ...rest,
            name: finalName,
            mobile: mobileToSave,
            role: 'party'
        });
        await userObj.save();
        res.status(201).json(userObj);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'A user with this Name and Phone number already exists.' });
        }
        console.error('[users create]', err);
        res.status(500).json({ message: 'Failed to create user.' });
    }
});

// PUT /api/users/:id - Update a contact (party)
router.put('/:id', auth, async (req, res) => {
    try {
        const { partyName, name, mobile, ...rest } = req.body;
        const userId = req.params.id;

        const userObj = await User.findOne({ _id: userId, role: { $in: ['party', 'user'] } });
        if (!userObj) {
            return res.status(404).json({ message: 'User not found' });
        }

        const finalName = name || partyName || userObj.name;
        const newMobile = mobile !== undefined ? mobile : userObj.mobile;

        // Check unique constraint if name or mobile changed
        if (finalName !== userObj.name || newMobile !== userObj.mobile) {
            const existing = await User.findOne({ name: finalName, mobile: newMobile, _id: { $ne: userId } });
            if (existing) {
                return res.status(409).json({ message: 'A user with this Name and Phone number already exists.' });
            }
        }

        const fields = ['initial', 'fatherName', 'motherName', 'spouseName', 'nickname', 'occupation', 'location', 'street', 'remarks'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) userObj[f] = req.body[f];
        });
        userObj.name = finalName;
        userObj.mobile = newMobile;

        await userObj.save();
        res.json(userObj);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'A user with this Name and Phone number already exists.' });
        }
        console.error('[users update]', err);
        res.status(500).json({ message: 'Failed to update user.' });
    }
});

// DELETE /api/users/:id - Delete a contact (party)
router.delete('/:id', auth, async (req, res) => {
    try {
        const userObj = await User.findOneAndDelete({ _id: req.params.id, role: { $in: ['party', 'user'] } });
        if (!userObj) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('[users delete]', err);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

module.exports = router;
