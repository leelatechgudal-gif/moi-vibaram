const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required to confirm action.' });
        }
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid password. Action canceled.' });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ message: 'Failed to verify password.' });
    }
};
