const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const rpName = 'Moi Vibaram';
const rpID = process.env.NODE_ENV === 'production' ? 'example.com' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:5173`;

// Temporary store for challenges (in production, use Redis or a DB)
const challenges = {};

// Get Registration Options
router.post('/register-options', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: user.email,
            userName: user.email,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
            },
        });

        challenges[user._id.toString()] = options.challenge;
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate registration options' });
    }
});

// Verify Registration
router.post('/register-verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        const expectedChallenge = challenges[user._id.toString()];
        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified) {
            const { registrationInfo } = verification;
            user.webAuthnCredentials = user.webAuthnCredentials || [];
            user.webAuthnCredentials.push({
                credentialID: registrationInfo.credentialID,
                credentialPublicKey: registrationInfo.credentialPublicKey,
                counter: registrationInfo.counter,
                transports: req.body.response.transports || []
            });
            await user.save();
            return res.json({ verified: true });
        }
        res.status(400).json({ verified: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Verification failed' });
    }
});

// Get Auth Options
router.post('/auth-options', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.webAuthnCredentials || user.webAuthnCredentials.length === 0) {
            return res.status(404).json({ message: 'No fingerprint registered for this user' });
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: user.webAuthnCredentials.map(c => ({
                id: c.credentialID,
                type: 'public-key',
                transports: c.transports,
            })),
            userVerification: 'required',
        });

        challenges[user.email] = options.challenge;
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate auth options' });
    }
});

// Verify Auth
router.post('/auth-verify', async (req, res) => {
    try {
        const { email, response } = req.body;
        const user = await User.findOne({ email });
        
        const expectedChallenge = challenges[email];
        const credential = user.webAuthnCredentials.find(c => Buffer.from(c.credentialID).toString('base64url') === response.id);

        if (!credential) return res.status(400).json({ message: 'Credential not found' });

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialPublicKey: credential.credentialPublicKey,
                credentialID: credential.credentialID,
                counter: credential.counter,
            }
        });

        if (verification.verified) {
            // Update counter
            credential.counter = verification.authenticationInfo.newCounter;
            await user.save();
            
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
            if (!user.activeSessions) user.activeSessions = [];
            user.activeSessions.push(token);
            await user.save();

            return res.json({
                verified: true,
                token,
                user: { _id: user._id, name: user.name, email: user.email, mobile: user.mobile, location: user.location, qrCode: user.qrCode, role: user.role }
            });
        }
        res.status(400).json({ verified: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Authentication failed' });
    }
});

module.exports = router;
