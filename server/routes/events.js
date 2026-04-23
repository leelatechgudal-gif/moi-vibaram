const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const ALLOWED_INVITATION_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `inv_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_INVITATION_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images or PDF files are allowed for invitations.'));
        }
    },
});

// GET /api/events - My events list
router.get('/', auth, async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await Event.countDocuments({ userId: req.userId });
            const events = await Event.find({ userId: req.userId }).sort({ date: -1 }).skip(skip).limit(limitNum);
            res.json({
                data: events,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const events = await Event.find({ userId: req.userId }).sort({ date: -1 });
            res.json(events);
        }
    } catch (err) {
        console.error('[events]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// GET /api/events/upcoming - Events where Moi has not been paid back
router.get('/upcoming', auth, async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        // Find all parties that I received Moi from, and check if I have paid them back
        const received = await Transaction.find({ userId: req.userId, type: 'received' }).populate('eventId');
        const paid = await Transaction.find({ userId: req.userId, type: 'paid' });

        const paidPartyMobiles = new Set(paid.map(t => t.mobile));

        const upcoming = received.filter(t => t.mobile && !paidPartyMobiles.has(t.mobile));

        // Group by party and get their latest event/date
        const partyMap = {};
        upcoming.forEach(t => {
            const key = t.mobile || t.partyName;
            if (!partyMap[key]) {
                partyMap[key] = {
                    initial: t.initial,
                    partyName: t.partyName,
                    mobile: t.mobile,
                    location: t.location,
                    cashAmount: 0,
                    event: t.eventId,
                    date: t.date,
                };
            }
            partyMap[key].cashAmount += t.cashAmount || 0;
        });

        const allUpcoming = Object.values(partyMap);

        if (pageNum) {
            const total = allUpcoming.length;
            const skip = (pageNum - 1) * limitNum;
            const paginated = allUpcoming.slice(skip, skip + limitNum);
            res.json({
                data: paginated,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            res.json(allUpcoming);
        }
    } catch (err) {
        console.error('[events]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// POST /api/events - Create event
router.post('/', auth, upload.single('invitation'), async (req, res) => {
    try {
        const { eventName, date, venue, location, city } = req.body;
        const event = new Event({
            userId: req.userId,
            eventName,
            date,
            venue,
            location,
            city,
            invitationFile: req.file ? `/uploads/${req.file.filename}` : undefined,
        });
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        console.error('[events]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// PUT /api/events/:id - Edit event
router.put('/:id', auth, upload.single('invitation'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, userId: req.userId });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { eventName, date, venue, location, city } = req.body;
        Object.assign(event, { eventName, date, venue, location, city });
        if (req.file) event.invitationFile = `/uploads/${req.file.filename}`;
        await event.save();
        res.json(event);
    } catch (err) {
        console.error('[events]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        // Also delete associated transactions
        await Transaction.deleteMany({ eventId: req.params.id });
        res.json({ message: 'Event and transactions deleted' });
    } catch (err) {
        console.error('[events]', err);
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

module.exports = router;
