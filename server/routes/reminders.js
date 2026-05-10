const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Reminder = require('../models/Reminder');
const auth = require('../middleware/auth');

// GET /api/reminders
router.get('/', auth, async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await Reminder.countDocuments({ userId: req.userId });
            const reminders = await Reminder.find({ userId: req.userId })
                .populate('partyId')
                .sort({ date: 1 })
                .skip(skip)
                .limit(limitNum);
            res.json({
                data: reminders,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const reminders = await Reminder.find({ userId: req.userId })
                .populate('partyId')
                .sort({ date: 1 });
            res.json(reminders);
        }
    } catch (err) {
        logger.error('[reminders]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// POST /api/reminders
router.post('/', auth, async (req, res) => {
    try {
        const { name, location, eventName, notes, date, notifyOnLogin, partyId } = req.body;
        const reminder = new Reminder({
            userId: req.userId,
            partyId,
            name,
            location,
            eventName,
            notes,
            date,
            notifyOnLogin: notifyOnLogin !== undefined ? notifyOnLogin : true
        });
        await reminder.save();
        res.status(201).json(reminder);
    } catch (err) {
        logger.error('[reminders]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// PUT /api/reminders/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.userId });
        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

        const { name, location, eventName, notes, date, notifyOnLogin, partyId } = req.body;
        if (name !== undefined) reminder.name = name;
        if (location !== undefined) reminder.location = location;
        if (eventName !== undefined) reminder.eventName = eventName;
        if (notes !== undefined) reminder.notes = notes;
        if (date !== undefined) reminder.date = date;
        if (notifyOnLogin !== undefined) reminder.notifyOnLogin = notifyOnLogin;
        if (partyId !== undefined) reminder.partyId = partyId;

        await reminder.save();
        res.json(reminder);
    } catch (err) {
        logger.error('[reminders]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// DELETE /api/reminders/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
        res.json({ message: 'Reminder deleted' });
    } catch (err) {
        logger.error('[reminders]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

// GET /api/reminders/upcoming - Get upcoming reminders within a week
router.get('/upcoming', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const reminders = await Reminder.find({
            userId: req.userId,
            date: { $gte: today, $lte: nextWeek },
            notifyOnLogin: true
        }).sort({ date: 1 });

        res.json(reminders);
    } catch (err) {
        logger.error('[reminders upcoming]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Request failed. Please try again.' });
    }
});

module.exports = router;
