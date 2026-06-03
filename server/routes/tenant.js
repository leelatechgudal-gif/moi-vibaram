const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Party = require('../models/Party');
const auth = require('../middleware/auth');
const verifyPassword = require('../middleware/verifyPassword');

// GET /api/tenant/members - List all members of my tenant
router.get('/members', auth, async (req, res) => {
    try {
        const members = await User.find({ 
            tenantId: req.tenantId, 
            isDeleted: { $ne: true } 
        }).select('name email mobile tenantRole role isActive createdAt').sort({ tenantRole: 1, name: 1 });

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
router.post('/transfer/:userId', auth, verifyPassword, async (req, res) => {
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

const bcrypt = require('bcryptjs');

// POST /api/tenant/users - Owner creates a user directly under their tenant
router.post('/users', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only tenant owners can create users.' });
        }

        const { name, mobile, email, password, role } = req.body;
        if (!name || !mobile || !email || !password) {
            return res.status(400).json({ message: 'Required fields missing (Name, Mobile, Email, Password).' });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        
        const newUser = new User({
            name,
            mobile,
            email: email.toLowerCase(),
            passwordHash,
            tenantId: req.tenantId,
            tenantRole: 'member',
            role: role || 'clerk', 
            isActive: true
        });

        await newUser.save();

        res.status(201).json({
            message: 'Tenant user created successfully.',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                mobile: newUser.mobile,
                role: newUser.role,
                tenantRole: newUser.tenantRole,
                isActive: newUser.isActive,
                createdAt: newUser.createdAt
            }
        });
    } catch (err) {
        console.error('[tenant create user]', err);
        res.status(500).json({ message: 'Failed to create tenant user.' });
    }
});

// PUT /api/tenant/users/:userId - Owner updates a tenant user (including status, password)
router.put('/users/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only tenant owners can update users.' });
        }

        const targetUser = await User.findOne({ _id: req.params.userId, tenantId: req.tenantId, isDeleted: { $ne: true } });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found in your tenant.' });
        }

        if (targetUser._id.toString() === req.userId) {
            return res.status(400).json({ message: 'Use profile page to edit your own details.' });
        }

        const { name, mobile, email, password, role, isActive } = req.body;

        if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
            const existingEmail = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
            if (existingEmail) {
                return res.status(409).json({ message: 'Email already registered.' });
            }
            targetUser.email = email.toLowerCase();
        }

        if (name) targetUser.name = name;
        if (mobile !== undefined) {
            if (!mobile || !mobile.toString().trim()) {
                return res.status(400).json({ message: 'Mobile number is required.' });
            }
            targetUser.mobile = mobile.toString().trim();
        }
        if (role) targetUser.role = role;
        if (isActive !== undefined) targetUser.isActive = isActive;

        if (password) {
            targetUser.passwordHash = await bcrypt.hash(password, 12);
        }

        await targetUser.save();

        res.json({
            message: 'Tenant user updated successfully.',
            user: {
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                mobile: targetUser.mobile,
                role: targetUser.role,
                tenantRole: targetUser.tenantRole,
                isActive: targetUser.isActive,
                createdAt: targetUser.createdAt
            }
        });
    } catch (err) {
        console.error('[tenant update user]', err);
        res.status(500).json({ message: 'Failed to update tenant user.' });
    }
});

// DELETE /api/tenant/users/:userId - Owner deletes a tenant user
router.delete('/users/:userId', auth, verifyPassword, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (currentUser.tenantRole !== 'owner') {
            return res.status(403).json({ message: 'Only tenant owners can delete users.' });
        }

        if (req.params.userId === req.userId) {
            return res.status(400).json({ message: 'You cannot delete yourself.' });
        }

        const targetUser = await User.findOne({ _id: req.params.userId, tenantId: req.tenantId });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found in your tenant.' });
        }

        targetUser.isDeleted = true;
        await targetUser.save();

        res.json({ message: 'Tenant user deleted successfully.' });
    } catch (err) {
        console.error('[tenant delete user]', err);
        res.status(500).json({ message: 'Failed to delete tenant user.' });
    }
});

module.exports = router;
