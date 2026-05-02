const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// GET /api/transactions - All transactions (with optional filters)
router.get('/', auth, async (req, res) => {
    try {
        const { eventId, type, page, limit } = req.query;
        const filter = { userId: req.userId };
        if (eventId) filter.eventId = eventId;
        if (type) filter.type = type;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await Transaction.countDocuments(filter);
            const transactions = await Transaction.find(filter)
                .populate('eventId')
                .populate('partyId')
                .sort({ date: -1 })
                .skip(skip)
                .limit(limitNum);
            res.json({
                data: transactions.map(flattenTransaction),
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            // Legacy behavior for unpaginated requests
            const transactions = await Transaction.find(filter)
                .populate('eventId')
                .populate('partyId')
                .sort({ date: -1 });
            res.json(transactions.map(flattenTransaction));
        }
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// GET /api/transactions/person-detail - Detailed history for a specific person
router.get('/person-detail', auth, async (req, res) => {
    try {
        const { partyId, partyName, mobile } = req.query;
        
        let targetPartyId = partyId;

        if (!targetPartyId) {
            // If no partyId, try to find by name and mobile
            const user = await User.findOne({ 
                name: partyName, 
                mobile: mobile || '' 
            });
            if (!user) return res.json({ transactions: [], totalReceived: 0, totalPaid: 0, balance: 0 });
            targetPartyId = user._id;
        }

        const filter = { partyId: targetPartyId };
        const transactions = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1 });

        const totalReceived = transactions.filter(t => t.type === 'received').reduce((s, t) => s + (t.cashAmount || 0), 0);
        const totalPaid = transactions.filter(t => t.type === 'paid').reduce((s, t) => s + (t.cashAmount || 0), 0);

        const party = await User.findById(targetPartyId);

        res.json({
            person: party,
            transactions: transactions.map(flattenTransaction),
            totalReceived,
            totalPaid,
            balance: totalReceived - totalPaid
        });
    } catch (err) {
        console.error("[transactions person-detail]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// Helper to flatten transaction and party data
function flattenTransaction(t) {
    const obj = t.toObject ? t.toObject() : t;
    if (obj.partyId && typeof obj.partyId === 'object') {
        const party = obj.partyId;
        return {
            ...obj,
            partyId: party._id,
            partyName: party.name,
            initial: party.initial,
            mobile: party.mobile,
            location: party.location,
            street: party.street,
            spouseName: party.spouseName,
            nickname: party.nickname,
            fatherName: party.fatherName,
            motherName: party.motherName,
            occupation: party.occupation,
            remarks: obj.remarks || party.remarks, // Prefer transaction remarks
        };
    }
    return obj;
}

// Helper to find or create a party
async function findOrCreateParty(data) {
    const { partyName, name, mobile, initial, fatherName, motherName, spouseName, nickname, occupation, location, street, remarks } = data;
    const finalName = name || partyName;
    const finalMobile = mobile || '';

    let user = await User.findOne({ name: finalName, mobile: finalMobile });
    if (!user) {
        user = new User({
            initial,
            name: finalName,
            mobile: finalMobile,
            fatherName,
            motherName,
            spouseName,
            nickname,
            occupation,
            location: location || 'Unknown',
            street,
            remarks,
            role: 'party'
        });
        await user.save();
    }
    return user;
}

// POST /api/transactions - Create Moi entry
router.post('/', auth, async (req, res) => {
    try {
        const {
            eventId, eventName, type, cashAmount, date,
            seerVarisai, remarks, thaiMama, labels,
            partyId, ...partyData
        } = req.body;

        if (type === 'received' && !eventId) {
            return res.status(400).json({ message: 'Event is required for received Moi' });
        }

        if (eventId) {
            const event = await Event.findOne({ _id: eventId, userId: req.userId });
            if (!event) return res.status(404).json({ message: 'Event not found' });
        }

        let finalPartyId = partyId;
        if (!finalPartyId) {
            const party = await findOrCreateParty(partyData);
            finalPartyId = party._id;
        }

        const transaction = new Transaction({
            userId: req.userId,
            partyId: finalPartyId,
            eventId: eventId || undefined,
            eventName,
            type,
            cashAmount: cashAmount || 0,
            date: date || Date.now(),
            seerVarisai,
            remarks,
            thaiMama,
            labels
        });
        await transaction.save();
        const populated = await transaction.populate(['eventId', 'partyId']);
        res.status(201).json(populated);
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// POST /api/transactions/bulk - Bulk create Moi entries
router.post('/bulk', auth, async (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ message: 'No transactions provided' });
        }

        const toInsert = [];
        for (const t of transactions) {
            let finalPartyId = t.partyId;
            if (!finalPartyId) {
                const party = await findOrCreateParty(t);
                finalPartyId = party._id;
            }
            toInsert.push({
                ...t,
                userId: req.userId,
                partyId: finalPartyId,
                eventId: t.eventId || undefined,
                date: t.date ? new Date(t.date) : Date.now(),
                cashAmount: parseFloat(t.cashAmount) || 0
            });
        }

        await Transaction.insertMany(toInsert);
        res.status(201).json({ message: `${toInsert.length} entries added successfully` });
    } catch (err) {
        console.error("[transactions bulk]", err);
        res.status(500).json({ message: "Bulk insert failed. Please check your data." });
    }
});


router.put('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        const fields = ['eventId', 'eventName', 'type', 'cashAmount', 'date', 'seerVarisai', 'remarks', 'thaiMama', 'labels'];
        fields.forEach(f => { if (req.body[f] !== undefined) transaction[f] = req.body[f]; });

        // Handle party change if needed
        if (req.body.partyId) {
            transaction.partyId = req.body.partyId;
        } else if (req.body.partyName || req.body.name) {
            const party = await findOrCreateParty(req.body);
            transaction.partyId = party._id;
        }

        await transaction.save();
        const populated = await transaction.populate(['eventId', 'partyId']);
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
        const transactions = await Transaction.find({ userId: req.userId }).populate('eventId').populate('partyId');

        const partyMap = {};
        transactions.forEach(t => {
            if (!t.partyId) return;
            const key = t.partyId._id.toString();
            if (!partyMap[key]) {
                const party = t.partyId.toObject();
                partyMap[key] = {
                    ...party,
                    partyName: party.name, // Ensure partyName is available for UI
                    totalReceived: 0,
                    totalPaid: 0,
                    transactions: [],
                };
            }
            if (t.type === 'received') partyMap[key].totalReceived += t.cashAmount || 0;
            if (t.type === 'paid') partyMap[key].totalPaid += t.cashAmount || 0;
            partyMap[key].transactions.push(flattenTransaction(t));
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
            const evtTxns = transactions.filter(t => t.eventId && t.eventId.toString() === e._id.toString());
            const totalPaid = evtTxns.filter(t => t.type === 'paid').reduce((s, t) => s + (t.cashAmount || 0), 0);
            const totalReceived = evtTxns.filter(t => t.type === 'received').reduce((s, t) => s + (t.cashAmount || 0), 0);
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

        // Calculate grand totals from ALL transactions
        grandTotalPaid = transactions.filter(t => t.type === 'paid').reduce((s, t) => s + (t.cashAmount || 0), 0);
        grandTotalReceived = transactions.filter(t => t.type === 'received').reduce((s, t) => s + (t.cashAmount || 0), 0);

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

// GET /api/transactions/search?q=&location=&eventId=&page=&limit=
router.get('/search', auth, async (req, res) => {
    try {
        const { q, location, eventId, page, limit } = req.query;
        const filter = { userId: req.userId };
        if (eventId) filter.eventId = eventId;
        
        // If searching by location or query, we first need to find matching users
        let partyIds = [];
        const userFilter = { role: { $in: ['party', 'user'] } };
        let userSearchActive = false;

        if (location) {
            userFilter.location = new RegExp(escapeRegex(location), 'i');
            userSearchActive = true;
        }

        if (q) {
            const safeQ = escapeRegex(q);
            userFilter.$or = [
                { name: new RegExp(safeQ, 'i') },
                { nickname: new RegExp(safeQ, 'i') },
                { mobile: new RegExp(safeQ, 'i') },
                { street: new RegExp(safeQ, 'i') },
                { fatherName: new RegExp(safeQ, 'i') },
                { motherName: new RegExp(safeQ, 'i') },
                { labels: new RegExp(safeQ, 'i') },
            ];
            userSearchActive = true;
        }

        if (userSearchActive) {
            const users = await User.find(userFilter).select('_id');
            partyIds = users.map(u => u._id);
            filter.partyId = { $in: partyIds };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await Transaction.countDocuments(filter);
            const results = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1 }).skip(skip).limit(limitNum);
            res.json({
                data: results.map(flattenTransaction),
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const results = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1 });
            res.json(results.map(flattenTransaction));
        }
    } catch (err) {
        console.error('[search]', err);
        res.status(500).json({ message: 'Search failed. Please try again.' });
    }
});

// GET /api/transactions/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId }).populate('eventId').populate('partyId');
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(flattenTransaction(transaction));
    } catch (err) {
        console.error("[transactions]", err);
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

module.exports = router;
