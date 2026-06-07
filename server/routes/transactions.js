const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Party = require('../models/Party');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// GET /api/transactions - All transactions (with optional filters)
router.get('/', auth, async (req, res) => {
    try {
        const { eventId, type, page, limit } = req.query;
        const tenantUserIds = await req.getTenantUserIds();
        const filter = { userId: { $in: tenantUserIds }, isDeleted: { $ne: true } };
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
                .sort({ date: -1, createdAt: -1 })
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
                .sort({ date: -1, createdAt: -1 });
            res.json(transactions.map(flattenTransaction));
        }
    } catch (err) {
        logger.error('[transactions]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// GET /api/transactions/person-detail - Detailed history for a specific person
router.get('/person-detail', auth, async (req, res) => {
    try {
        const { partyId, partyName, mobile, initial, spouseName, location } = req.query;
        
        let targetPartyId = partyId;

        if (!targetPartyId) {
            const buildOptQuery = (val) => val ? val : { $in: ['', null] };
            
            // If no partyId, try to find by all unique constraints within this tenant
            const party = await Party.findOne({ 
                name: partyName, 
                mobile: buildOptQuery(mobile),
                initial: buildOptQuery(initial),
                spouseName: buildOptQuery(spouseName),
                location: buildOptQuery(location),
                tenantId: req.tenantId,
                isDeleted: { $ne: true }
            });
            if (!party) return res.json({ transactions: [], totalReceived: 0, totalPaid: 0, balance: 0 });
            targetPartyId = party._id;
        }

        const filter = { partyId: targetPartyId, isDeleted: { $ne: true } };
        const transactions = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1 });

        const totalReceived = transactions.filter(t => t.type === 'received').reduce((s, t) => s + (t.cashAmount || 0), 0);
        const totalPaid = transactions.filter(t => t.type === 'paid').reduce((s, t) => s + (t.cashAmount || 0), 0);

        const party = await Party.findById(targetPartyId);

        res.json({
            person: party,
            transactions: transactions.map(flattenTransaction),
            totalReceived,
            totalPaid,
            balance: totalReceived - totalPaid
        });
    } catch (err) {
        logger.error("[transactions person-detail]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// Helper to flatten transaction and party data
function flattenTransaction(t) {
    const obj = t.toObject ? t.toObject() : t;
    obj.paymentType = obj.paymentType || 'cash';
    if (obj.partyId && typeof obj.partyId === 'object') {
        const party = obj.partyId;
        return {
            ...obj,
            paymentType: obj.paymentType || 'cash',
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

// Helper to find or create a party (scoped by tenantId)
async function findOrCreateParty(data, tenantId, userId) {
    const { partyName, name, mobile, initial, fatherName, motherName, spouseName, nickname, occupation, location, street, remarks } = data;
    const finalName = name || partyName;
    const finalMobile = mobile || '';
    const finalInitial = initial || '';
    const finalSpouseName = spouseName || '';
    const finalLocation = location || '';

    const buildOptQuery = (val) => val ? val : { $in: ['', null] };

    const filter = { 
        name: finalName, 
        mobile: buildOptQuery(finalMobile), 
        initial: buildOptQuery(finalInitial),
        spouseName: buildOptQuery(finalSpouseName),
        location: buildOptQuery(finalLocation),
        tenantId, 
        isDeleted: { $ne: true } 
    };

    let party = await Party.findOne(filter);
    if (!party) {
        party = new Party({
            tenantId,
            initial: finalInitial,
            name: finalName,
            mobile: finalMobile,
            fatherName,
            motherName,
            spouseName: finalSpouseName,
            nickname,
            occupation,
            location: finalLocation,
            street,
            remarks,
            createdBy: userId
        });
        await party.save();
    } else {
        let changed = false;
        if (occupation !== undefined && party.occupation !== occupation) {
            party.occupation = occupation;
            changed = true;
        }
        if (fatherName !== undefined && party.fatherName !== fatherName) {
            party.fatherName = fatherName;
            changed = true;
        }
        if (motherName !== undefined && party.motherName !== motherName) {
            party.motherName = motherName;
            changed = true;
        }
        if (nickname !== undefined && party.nickname !== nickname) {
            party.nickname = nickname;
            changed = true;
        }
        if (street !== undefined && party.street !== street) {
            party.street = street;
            changed = true;
        }
        if (changed) {
            await party.save();
        }
    }
    return party;
}

// POST /api/transactions - Create Moi entry
router.post('/', auth, async (req, res) => {
    try {
        const {
            eventId, eventName, type, cashAmount, date,
            seerVarisai, remarks, thaiMama, labels,
            partyId, paymentType, ...partyData
        } = req.body;

        if (type === 'received' && !eventId) {
            return res.status(400).json({ message: 'Event is required for received Moi' });
        }

        if (type === 'received') {
            let finalInitial = partyData.initial;
            let finalName = partyData.partyName || partyData.name;
            let finalSpouseName = partyData.spouseName;
            let finalMobile = partyData.mobile;
            let finalLocation = partyData.location;
            let finalOccupation = partyData.occupation;

            if (partyId) {
                const party = await Party.findOne({ _id: partyId, tenantId: req.tenantId, isDeleted: { $ne: true } });
                if (!party) return res.status(404).json({ message: 'Party not found' });
                finalInitial = finalInitial || party.initial;
                finalName = finalName || party.name;
                finalSpouseName = finalSpouseName || party.spouseName;
                finalMobile = finalMobile || party.mobile;
                finalLocation = finalLocation || party.location;
                finalOccupation = finalOccupation || party.occupation;
            }

            if (!finalName || !finalName.trim()) return res.status(400).json({ message: 'Name is required' });
            if (!finalSpouseName || !finalSpouseName.trim()) return res.status(400).json({ message: 'Spouse Name is required' });
            if (!finalLocation || !finalLocation.trim()) return res.status(400).json({ message: 'Location is required' });
            if (!paymentType || !['cash', 'gpay'].includes(paymentType)) return res.status(400).json({ message: 'Valid payment type (cash or gpay) is required' });
            if (cashAmount === undefined || parseFloat(cashAmount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        if (eventId) {
            const tenantUserIds = await req.getTenantUserIds();
            const event = await Event.findOne({ _id: eventId, userId: { $in: tenantUserIds } });
            if (!event) return res.status(404).json({ message: 'Event not found' });
        }

        let finalPartyId = partyId;
        if (!finalPartyId) {
            const party = await findOrCreateParty(partyData, req.tenantId, req.userId);
            finalPartyId = party._id;
        } else {
            // Update the existing party with updated fields if any are provided
            const party = await Party.findOne({ _id: finalPartyId, tenantId: req.tenantId, isDeleted: { $ne: true } });
            if (party) {
                let changed = false;
                const fields = {
                    initial: partyData.initial,
                    name: partyData.partyName || partyData.name,
                    spouseName: partyData.spouseName,
                    mobile: partyData.mobile,
                    location: partyData.location,
                    occupation: partyData.occupation
                };
                for (const [key, val] of Object.entries(fields)) {
                    if (val !== undefined && party[key] !== val) {
                        party[key] = val;
                        changed = true;
                    }
                }
                if (changed) {
                    await party.save();
                }
            }
        }

        const transaction = new Transaction({
            userId: req.userId,
            partyId: finalPartyId,
            eventId: eventId || undefined,
            eventName,
            type,
            cashAmount: cashAmount || 0,
            paymentType: paymentType || 'cash',
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
        logger.error("[transactions]", { message: err.message, stack: err.stack });
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
                const party = await findOrCreateParty(t, req.tenantId);
                finalPartyId = party._id;
            }

            // Auto-create Event if not provided but eventName is given
            let finalEventId = t.eventId;
            if (!finalEventId && t.eventName) {
                const tenantUserIds = await req.getTenantUserIds();
                let event = await Event.findOne({ eventName: t.eventName, userId: { $in: tenantUserIds } });
                if (!event) {
                    event = new Event({
                        eventName: t.eventName,
                        date: t.date ? new Date(t.date) : Date.now(),
                        userId: req.userId
                    });
                    await event.save();
                }
                finalEventId = event._id;
            }

            toInsert.push({
                ...t,
                userId: req.userId,
                partyId: finalPartyId,
                eventId: finalEventId || undefined,
                date: t.date ? new Date(t.date) : Date.now(),
                cashAmount: parseFloat(t.cashAmount) || 0
            });
        }

        await Transaction.insertMany(toInsert);
        res.status(201).json({ message: `${toInsert.length} entries added successfully` });
    } catch (err) {
        logger.error("[transactions bulk]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Bulk insert failed. Please check your data." });
    }
});


router.put('/:id', auth, async (req, res) => {
    try {
        const tenantUserIds = await req.getTenantUserIds();
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: { $in: tenantUserIds }, isDeleted: { $ne: true } });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        // Clerk cashAmount edit check
        const originalAmount = transaction.cashAmount;
        const newAmount = req.body.cashAmount !== undefined ? parseFloat(req.body.cashAmount) : transaction.cashAmount;

        const currentUser = await User.findById(req.userId).select('role');
        if (!currentUser) return res.status(401).json({ message: 'User not found' });

        if (currentUser.role === 'clerk' && originalAmount !== newAmount) {
            const { otp } = req.body;
            const owner = await User.findOne({ tenantId: req.tenantId, tenantRole: 'owner', isDeleted: { $ne: true } });
            if (!owner) {
                return res.status(400).json({ message: 'No tenant owner found to authorize this edit.' });
            }

            if (!otp) {
                // Generate and send OTP to owner
                const { generateOTP } = require('../utils/email');
                const generatedOtp = generateOTP();
                owner.otpCode = generatedOtp;
                owner.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
                await owner.save();

                // Send OTP via SMS to owner
                const { sendSMS } = require('../utils/sms');
                await sendSMS(owner.mobile, generatedOtp);
                
                // Fallback to sending OTP via email if nodemailer is set up
                if (owner.email) {
                    try {
                        const nodemailer = require('nodemailer');
                        if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_gmail@gmail.com') {
                            const transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: process.env.EMAIL_USER,
                                    pass: process.env.EMAIL_PASS,
                                },
                            });
                            await transporter.sendMail({
                                from: `"MOI VIBARAM" <${process.env.EMAIL_USER}>`,
                                to: owner.email,
                                subject: 'MOI VIBARAM - Clerk Edit Authorization OTP',
                                html: `
                                  <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
                                    <h2 style="color:#6c63ff;">MOI VIBARAM</h2>
                                    <p>A clerk is trying to edit a transaction amount. The authorization OTP is:</p>
                                    <h1 style="color:#6c63ff;letter-spacing:8px;">${generatedOtp}</h1>
                                    <p>This OTP expires in <strong>10 minutes</strong>.</p>
                                  </div>
                                `,
                            });
                        }
                    } catch (e) {
                        logger.error('[clerk-edit-otp] Email fallback failed', e);
                    }
                }

                return res.json({ otpRequired: true, message: `An authorization OTP has been sent to the owner's mobile ending in ${owner.mobile ? owner.mobile.slice(-4) : 'xxxx'}.` });
            } else {
                // Verify OTP
                const crypto = require('crypto');
                if (!owner.otpCode || new Date() > owner.otpExpiry) {
                    return res.status(400).json({ message: 'OTP expired or not requested. Please try saving again to request a new OTP.' });
                }
                const otpMatch = crypto.timingSafeEqual(
                    Buffer.from(String(owner.otpCode)),
                    Buffer.from(String(otp))
                );
                if (!otpMatch) {
                    return res.status(400).json({ message: 'Invalid OTP. Please check the OTP sent to owner.' });
                }

                // Clear OTP after successful verify
                owner.otpCode = undefined;
                owner.otpExpiry = undefined;
                await owner.save();
            }
        }

        const fields = ['eventId', 'eventName', 'type', 'cashAmount', 'date', 'seerVarisai', 'remarks', 'thaiMama', 'labels', 'paymentType'];
        fields.forEach(f => { 
            if (req.body[f] !== undefined) {
                if (f === 'eventId' && req.body[f] === '') {
                    transaction.eventId = undefined;
                } else {
                    transaction[f] = req.body[f]; 
                }
            }
        });

        // Validation for received transactions
        if (transaction.type === 'received') {
            const initial = req.body.initial !== undefined ? req.body.initial : transaction.initial;
            const partyName = req.body.partyName || req.body.name || transaction.partyName;
            const spouseName = req.body.spouseName !== undefined ? req.body.spouseName : transaction.spouseName;
            const mobile = req.body.mobile !== undefined ? req.body.mobile : transaction.mobile;
            const location = req.body.location !== undefined ? req.body.location : transaction.location;
            const occupation = req.body.occupation !== undefined ? req.body.occupation : transaction.occupation;
            const paymentType = req.body.paymentType !== undefined ? req.body.paymentType : transaction.paymentType;
            const cashAmount = req.body.cashAmount !== undefined ? req.body.cashAmount : transaction.cashAmount;

            let finalInitial = initial;
            let finalName = partyName;
            let finalSpouseName = spouseName;
            let finalMobile = mobile;
            let finalLocation = location;
            let finalOccupation = occupation;

            let finalPartyId = req.body.partyId || transaction.partyId;
            if (finalPartyId) {
                const party = await Party.findOne({ _id: finalPartyId, tenantId: req.tenantId, isDeleted: { $ne: true } });
                if (party) {
                    finalInitial = finalInitial || party.initial;
                    finalName = finalName || party.name;
                    finalSpouseName = finalSpouseName || party.spouseName;
                    finalMobile = finalMobile || party.mobile;
                    finalLocation = finalLocation || party.location;
                    finalOccupation = finalOccupation || party.occupation;
                }
            }

            if (!finalName || !finalName.trim()) return res.status(400).json({ message: 'Name is required' });
            if (!finalSpouseName || !finalSpouseName.trim()) return res.status(400).json({ message: 'Spouse Name is required' });
            if (!finalLocation || !finalLocation.trim()) return res.status(400).json({ message: 'Location is required' });
            if (!paymentType || !['cash', 'gpay'].includes(paymentType)) return res.status(400).json({ message: 'Valid payment type (cash or gpay) is required' });
            if (cashAmount === undefined || parseFloat(cashAmount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
        }

        // Handle party change if needed
        if (req.body.partyId) {
            transaction.partyId = req.body.partyId;
            // Also update the party details if they differ and are provided
            const party = await Party.findOne({ _id: req.body.partyId, tenantId: req.tenantId, isDeleted: { $ne: true } });
            if (party) {
                let changed = false;
                const fieldsToUpdate = {
                    initial: req.body.initial,
                    name: req.body.partyName || req.body.name,
                    spouseName: req.body.spouseName,
                    mobile: req.body.mobile,
                    location: req.body.location,
                    occupation: req.body.occupation
                };
                for (const [key, val] of Object.entries(fieldsToUpdate)) {
                    if (val !== undefined && party[key] !== val) {
                        party[key] = val;
                        changed = true;
                    }
                }
                if (changed) {
                    await party.save();
                }
            }
        } else if (req.body.partyName || req.body.name) {
            const party = await findOrCreateParty(req.body, req.tenantId);
            transaction.partyId = party._id;
        }

        await transaction.save();
        const populated = await transaction.populate(['eventId', 'partyId']);
        res.json(populated);
    } catch (err) {
        logger.error("[transactions]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// DELETE /api/transactions/:id
const verifyPassword = require('../middleware/verifyPassword');

router.delete('/:id', auth, verifyPassword, async (req, res) => {
    try {
        const tenantUserIds = await req.getTenantUserIds();
        const transaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, userId: { $in: tenantUserIds } },
            { isDeleted: true },
            { new: true }
        );
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        logger.error("[transactions]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// GET /api/transactions/balance-sheet - Person-wise aggregation
router.get('/balance-sheet', auth, async (req, res) => {
    try {
        const tenantUserIds = await req.getTenantUserIds();
        const transactions = await Transaction.find({ userId: { $in: tenantUserIds }, isDeleted: { $ne: true } }).populate('eventId').populate('partyId');

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
        logger.error("[transactions]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});
// GET /api/transactions/master-sheet - Event-wise summary
router.get('/master-sheet', auth, async (req, res) => {
    try {
        const tenantUserIds = await req.getTenantUserIds();
        const events = await Event.find({ userId: { $in: tenantUserIds } }).sort({ date: -1 });
        const transactions = await Transaction.find({ userId: { $in: tenantUserIds }, isDeleted: { $ne: true } });

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
        logger.error("[transactions]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

// Escape special regex chars to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/transactions/search?q=&location=&eventId=&page=&limit=
router.get('/search', auth, async (req, res) => {
    try {
        const { q, location, eventId, page, limit } = req.query;
        const tenantUserIds = await req.getTenantUserIds();
        const filter = { userId: { $in: tenantUserIds }, isDeleted: { $ne: true } };
        if (eventId) filter.eventId = eventId;
        
        // If searching by location or query, we first need to find matching parties
        let partyIds = [];
        const partyFilter = { tenantId: req.tenantId, isDeleted: { $ne: true } };
        let partySearchActive = false;

        if (location) {
            partyFilter.location = new RegExp(escapeRegex(location), 'i');
            partySearchActive = true;
        }

        if (q) {
            const safeQ = escapeRegex(q);
            partyFilter.$or = [
                { name: new RegExp(safeQ, 'i') },
                { nickname: new RegExp(safeQ, 'i') },
                { mobile: new RegExp(safeQ, 'i') },
                { street: new RegExp(safeQ, 'i') },
                { fatherName: new RegExp(safeQ, 'i') },
                { motherName: new RegExp(safeQ, 'i') },
                { labels: new RegExp(safeQ, 'i') },
            ];
            partySearchActive = true;
        }

        if (partySearchActive) {
            const parties = await Party.find(partyFilter).select('_id');
            partyIds = parties.map(p => p._id);
            filter.partyId = { $in: partyIds };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;

        if (pageNum) {
            const skip = (pageNum - 1) * limitNum;
            const total = await Transaction.countDocuments(filter);
            const results = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum);
            res.json({
                data: results.map(flattenTransaction),
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const results = await Transaction.find(filter).populate('eventId').populate('partyId').sort({ date: -1, createdAt: -1 });
            res.json(results.map(flattenTransaction));
        }
    } catch (err) {
        logger.error('[search]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Search failed. Please try again.' });
    }
});

// GET /api/transactions/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const tenantUserIds = await req.getTenantUserIds();
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: { $in: tenantUserIds }, isDeleted: { $ne: true } }).populate('eventId').populate('partyId');
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(flattenTransaction(transaction));
    } catch (err) {
        logger.error("[transactions]", { message: err.message, stack: err.stack });
        res.status(500).json({ message: "Request failed. Please try again." });
    }
});

module.exports = router;
