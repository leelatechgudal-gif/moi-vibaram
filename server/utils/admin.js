const AdminWhitelist = require('../models/AdminWhitelist');

async function isWhitelistedAdmin(email) {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    // Predefined super admins
    if (lowerEmail === 'naveenkumarcbm@gmail.com' || lowerEmail.endsWith('@leelatech.co.in')) {
        return true;
    }
    // Check MongoDB whitelist
    const found = await AdminWhitelist.findOne({ email: lowerEmail });
    return !!found;
}

module.exports = { isWhitelistedAdmin };
