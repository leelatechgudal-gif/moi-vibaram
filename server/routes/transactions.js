const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// GET /api/transactions - All transactions (with optional filters)
router.get('/', auth, async (req, res) => {
    try {
        const { eventId, type } = req.query;
        const filter = { userId: req.userId };
        if (eventId) filter.eventId = eventId;
        if (type) filter.type = type;

        const transactions = await Transaction.find(filter).populate('eventId').sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// POST /api/transactions - Create Moi entry
router.post('/', auth, async (req, res) => {
    try {
        const {
            eventId, partyName, spouseName, nickname, occupation,
            location, street, mobile, type, cashAmount, date,
            seerVarisai, remarks,
        } = req.body;

        const event = await Event.findOne({ _id: eventId, userId: req.userId });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const transaction = new Transaction({
            userId: req.userId,
            eventId,
            partyName, spouseName, nickname, occupation,
            location, street, mobile, type,
            cashAmount: cashAmount || 0,
            date: date || Date.now(),
            seerVarisai,
            remarks,
        });
        await transaction.save();
        const populated = await transaction.populate('eventId');
        res.status(201).json(populated);
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// PUT /api/transactions/:id - Edit transaction
router.put('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const fields = ['partyName', 'spouseName', 'nickname', 'occupation', 'location', 'street', 'mobile', 'type', 'cashAmount', 'date', 'seerVarisai', 'remarks'];
        fields.forEach(f => { if (req.body[f] !== undefined) transaction[f] = req.body[f]; });
        await transaction.save();
        const populated = await transaction.populate('eventId');
        res.json(populated);
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// DELETE /api/transactions/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// GET /api/transactions/balance-sheet - Person-wise aggregation
router.get('/balance-sheet', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId }).populate('eventId');

        const partyMap = {};
        transactions.forEach(t => {
            const key = t.mobile || t.partyName;
            if (!partyMap[key]) {
                partyMap[key] = {
                    partyName: t.partyName,
                    spouseName: t.spouseName,
                    mobile: t.mobile,
                    location: t.location,
                    totalReceived: 0,
                    totalPaid: 0,
                    transactions: [],
                };
            }
            if (t.type === 'received') partyMap[key].totalReceived += t.cashAmount || 0;
            if (t.type === 'paid') partyMap[key].totalPaid += t.cashAmount || 0;
            partyMap[key].transactions.push(t);
        });

        const result = Object.values(partyMap).map(p => ({
            ...p,
            balance: p.totalReceived - p.totalPaid,
        }));

        res.json(result);
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// GET /api/transactions/master-sheet - Event-wise summary
router.get('/master-sheet', auth, async (req, res) => {
    try {
        const events = await Event.find({ userId: req.userId }).sort({ date: -1 });
        const transactions = await Transaction.find({ userId: req.userId });

        let grandTotalPaid = 0;
        let grandTotalReceived = 0;

        const eventSummary = events.map(e => {
            const evtTxns = transactions.filter(t => t.eventId.toString() === e._id.toString());
            const totalPaid = evtTxns.filter(t => t.type === 'paid').reduce((s, t) => s + (t.cashAmount || 0), 0);
            const totalReceived = evtTxns.filter(t => t.type === 'received').reduce((s, t) => s + (t.cashAmount || 0), 0);
            grandTotalPaid += totalPaid;
            grandTotalReceived += totalReceived;
            return {
                _id: e._id,
                eventName: e.eventName,
                date: e.date,
                venue: e.venue,
                location: e.location,
                totalPaid,
                totalReceived,
                balance: totalReceived - totalPaid,
            };
        });

        res.json({
            events: eventSummary,
            grandTotalPaid,
            grandTotalReceived,
            closingBalance: grandTotalReceived - grandTotalPaid,
        });
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// Escape special regex chars to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/transactions/search?q=&location=&eventId=
router.get('/search', auth, async (req, res) => {
    try {
        const { q, location, eventId } = req.query;
        const filter = { userId: req.userId };
        if (eventId) filter.eventId = eventId;
        if (location) filter.location = new RegExp(escapeRegex(location), 'i');
        if (q) {
            const safeQ = escapeRegex(q);
            filter.$or = [
                { partyName: new RegExp(safeQ, 'i') },
                { nickname: new RegExp(safeQ, 'i') },
                { mobile: new RegExp(safeQ, 'i') },
            ];
        }

        const results = await Transaction.find(filter).populate('eventId').sort({ date: -1 });
        res.json(results);
    } catch (err) {
        console.error('[search]', err);
        res.status(500).json({ message: 'Search failed. Please try again.' });
    }
});

module.exports = router;
