const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Party = require('../models/Party');
const auth = require('../middleware/auth');

// GET /api/tenant/members - List all members of my tenant
router.get('/members', auth, async (req, res) => {
    try {
        const members = await User.find({ 
            tenantId: req.tenantId, 
            isDeleted: { $ne: true } 
        }).select('name email mobile tenantRole createdAt').sort({ tenantRole: 1, name: 1 });

        const currentUser = await User.findById(req.userId).select('tenantRole');

        res.json({
            tenantId: req.tenantId,
            myRole: currentUser.tenantRole,
            members
        });
    } catch (err) {
        console.error('[tenant members]', err);
        res.status(500).json({ message: 'Failed to fetch tenant members.' });
    }
});

// POST /api/tenant/invite - Owner invites a user by email to their tenant
router.post('/invite', auth, async (req, res) => {
    try {
        // Only owners can invite
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only tenant owners can invite members.' });
        }

        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        // Cannot invite yourself
        if (email.toLowerCase() === currentUser.email.toLowerCase()) {
            return res.status(400).json({ message: 'You cannot invite yourself.' });
        }

        const invitee = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
        if (!invitee) {
            return res.status(404).json({ message: 'No registered user found with that email.' });
        }

        // Check if already in the same tenant
        if (invitee.tenantId === req.tenantId) {
            return res.status(409).json({ message: 'This user is already a member of your tenant.' });
        }

        // Move the invitee's existing parties to the new tenant
        const oldTenantId = invitee.tenantId;
        await Party.updateMany(
            { tenantId: oldTenantId, isDeleted: { $ne: true } },
            { tenantId: req.tenantId }
        );

        // Update the invitee
        invitee.tenantId = req.tenantId;
        invitee.tenantRole = 'member';
        await invitee.save();

        res.json({ 
            message: `${invitee.name} has been added to your tenant.`,
            member: { _id: invitee._id, name: invitee.name, email: invitee.email, mobile: invitee.mobile, tenantRole: invitee.tenantRole }
        });
    } catch (err) {
        console.error('[tenant invite]', err);
        res.status(500).json({ message: 'Failed to invite member.' });
    }
});

// POST /api/tenant/remove/:userId - Owner removes a member from tenant
router.post('/remove/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only tenant owners can remove members.' });
        }

        // Cannot remove yourself
        if (req.params.userId === req.userId) {
            return res.status(400).json({ message: 'You cannot remove yourself. Transfer ownership first.' });
        }

        const member = await User.findOne({ _id: req.params.userId, tenantId: req.tenantId });
        if (!member) {
            return res.status(404).json({ message: 'Member not found in your tenant.' });
        }

        // Give the removed member their own fresh tenant
        member.tenantId = uuidv4();
        member.tenantRole = 'owner';
        await member.save();

        res.json({ message: `${member.name} has been removed from your tenant.` });
    } catch (err) {
        console.error('[tenant remove]', err);
        res.status(500).json({ message: 'Failed to remove member.' });
    }
});

// POST /api/tenant/leave - Member leaves the tenant voluntarily
router.post('/leave', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        
        if (currentUser.tenantRole === 'owner') {
            // Check if there are other members
            const memberCount = await User.countDocuments({ 
                tenantId: req.tenantId, 
                isDeleted: { $ne: true },
                _id: { $ne: req.userId }
            });
            if (memberCount > 0) {
                return res.status(400).json({ 
                    message: 'You are the owner. Transfer ownership or remove all members before leaving.' 
                });
            }
        }

        // Give the user their own fresh tenant
        currentUser.tenantId = uuidv4();
        currentUser.tenantRole = 'owner';
        await currentUser.save();

        res.json({ message: 'You have left the tenant and have your own workspace now.' });
    } catch (err) {
        console.error('[tenant leave]', err);
        res.status(500).json({ message: 'Failed to leave tenant.' });
    }
});

// POST /api/tenant/transfer/:userId - Transfer ownership to another member
router.post('/transfer/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only owners can transfer ownership.' });
        }

        const newOwner = await User.findOne({ _id: req.params.userId, tenantId: req.tenantId });
        if (!newOwner) {
            return res.status(404).json({ message: 'Member not found in your tenant.' });
        }

        currentUser.tenantRole = 'member';
        newOwner.tenantRole = 'owner';
        await currentUser.save();
        await newOwner.save();

        res.json({ message: `Ownership transferred to ${newOwner.name}.` });
    } catch (err) {
        console.error('[tenant transfer]', err);
        res.status(500).json({ message: 'Failed to transfer ownership.' });
    }
});

module.exports = router;
