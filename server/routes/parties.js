const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// GET /api/parties - Get all contacts (parties) for this tenant
router.get('/', auth, async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        
        if (!req.tenantId) {
            logger.warn('[parties get] Missing tenantId in request context');
            return res.status(400).json({ message: 'Tenant ID is required.' });
        }

        const filter = { tenantId: req.tenantId, isDeleted: { $ne: true } };
        
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
            const total = await Party.countDocuments(filter);
            const parties = await Party.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum);
            res.json({
                data: parties,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum * limitNum < total
            });
        } else {
            const parties = await Party.find(filter).sort({ name: 1 });
            res.json(parties);
        }
    } catch (err) {
        logger.error('[parties get]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to fetch parties.' });
    }
});

// POST /api/parties - Create a new contact (party)
router.post('/', auth, async (req, res) => {
    try {
        if (!req.tenantId) {
            logger.warn('[parties create] Missing tenantId in request context');
            return res.status(400).json({ message: 'Tenant ID is required.' });
        }

        const { partyName, name, mobile, ...rest } = req.body;
        const finalName = name || partyName;
        if (!finalName) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Check for unique combination within this tenant
        const mobileToSave = mobile || '';
        const initialToSave = rest.initial || '';
        const spouseNameToSave = rest.spouseName || '';
        const locationToSave = rest.location || '';
        
        const buildOptQuery = (val) => val ? val : { $in: ['', null] };
        
        const existing = await Party.findOne({ 
            name: finalName, 
            initial: buildOptQuery(initialToSave),
            spouseName: buildOptQuery(spouseNameToSave),
            location: buildOptQuery(locationToSave),
            mobile: buildOptQuery(mobileToSave), 
            tenantId: req.tenantId, 
            isDeleted: { $ne: true } 
        });
        if (existing) {
            return res.status(409).json({ message: 'A party with this Initial, Name, Mobile, Spouse Name, and Location already exists.' });
        }

        const partyObj = new Party({
            ...rest,
            name: finalName,
            initial: initialToSave,
            spouseName: spouseNameToSave,
            location: locationToSave,
            mobile: mobileToSave,
            tenantId: req.tenantId,
            createdBy: req.userId
        });
        await partyObj.save();
        res.status(201).json(partyObj);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'A party with this Initial, Name, Mobile, Spouse Name, and Location already exists.' });
        }
        logger.error('[parties create]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to create party.' });
    }
});

// PUT /api/parties/:id - Update a contact (party)
router.put('/:id', auth, async (req, res) => {
    try {
        if (!req.tenantId) {
            logger.warn('[parties update] Missing tenantId in request context');
            return res.status(400).json({ message: 'Tenant ID is required.' });
        }

        const { partyName, name, mobile, ...rest } = req.body;
        const partyId = req.params.id;

        const partyObj = await Party.findOne({ _id: partyId, tenantId: req.tenantId, isDeleted: { $ne: true } });
        if (!partyObj) {
            return res.status(404).json({ message: 'Party not found' });
        }

        const finalName = name || partyName || partyObj.name;
        const newMobile = mobile !== undefined ? mobile : partyObj.mobile;

        const initialToSave = req.body.initial !== undefined ? req.body.initial : (partyObj.initial || '');
        const spouseNameToSave = req.body.spouseName !== undefined ? req.body.spouseName : (partyObj.spouseName || '');
        const locationToSave = req.body.location !== undefined ? req.body.location : (partyObj.location || '');

        const buildOptQuery = (val) => val ? val : { $in: ['', null] };

        // Check unique constraint (within this tenant)
        if (finalName !== partyObj.name || newMobile !== partyObj.mobile || initialToSave !== partyObj.initial || spouseNameToSave !== partyObj.spouseName || locationToSave !== partyObj.location) {
            const existing = await Party.findOne({ 
                name: finalName, 
                initial: buildOptQuery(initialToSave),
                spouseName: buildOptQuery(spouseNameToSave),
                location: buildOptQuery(locationToSave),
                mobile: buildOptQuery(newMobile), 
                tenantId: req.tenantId, 
                _id: { $ne: partyId }, 
                isDeleted: { $ne: true } 
            });
            if (existing) {
                return res.status(409).json({ message: 'A party with this Initial, Name, Mobile, Spouse Name, and Location already exists.' });
            }
        }

        const fields = ['fatherName', 'motherName', 'nickname', 'occupation', 'street', 'remarks'];
        fields.forEach(f => {
            if (req.body[f] !== undefined) partyObj[f] = req.body[f];
        });
        partyObj.name = finalName;
        partyObj.mobile = newMobile;
        partyObj.initial = initialToSave;
        partyObj.spouseName = spouseNameToSave;
        partyObj.location = locationToSave;

        await partyObj.save();
        res.json(partyObj);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'A party with this Initial, Name, Mobile, Spouse Name, and Location already exists.' });
        }
        logger.error('[parties update]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to update party.' });
    }
});

const verifyPassword = require('../middleware/verifyPassword');

// DELETE /api/parties/:id - Delete a contact (party)
router.delete('/:id', auth, verifyPassword, async (req, res) => {
    try {
        if (!req.tenantId) {
            logger.warn('[parties delete] Missing tenantId in request context');
            return res.status(400).json({ message: 'Tenant ID is required.' });
        }

        const partyObj = await Party.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { isDeleted: true },
            { new: true }
        );
        if (!partyObj) {
            return res.status(404).json({ message: 'Party not found' });
        }
        
        // Also soft delete associated transactions
        await Transaction.updateMany({ partyId: req.params.id }, { isDeleted: true });

        res.json({ message: 'Party deleted successfully' });
    } catch (err) {
        logger.error('[parties delete]', { message: err.message, stack: err.stack });
        res.status(500).json({ message: 'Failed to delete party.' });
    }
});

module.exports = router;
