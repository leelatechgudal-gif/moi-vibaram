const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Auth middleware: missing or malformed token', { url: req.originalUrl, ip: req.ip });
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;

        // Fetch tenantId and attach to request for tenant-scoped queries
        const user = await User.findById(decoded.userId).select('tenantId').lean();
        if (!user) {
            logger.warn('Auth middleware: userId from token not found in DB', { userId: decoded.userId });
            return res.status(401).json({ message: 'User not found' });
        }
        req.tenantId = user.tenantId;

        // Lazy-load helper to fetch tenant user IDs on demand and cache them
        req.getTenantUserIds = async () => {
            if (!req._tenantUserIds) {
                const tenantUsers = await User.find({ tenantId: user.tenantId }).select('_id').lean();
                req._tenantUserIds = tenantUsers.map(u => u._id);
            }
            return req._tenantUserIds;
        };

        logger.debug('Auth middleware: token valid', { 
            userId: req.userId, 
            tenantId: req.tenantId, 
            url: req.originalUrl 
        });

        next();
    } catch (err) {
        logger.warn('Auth middleware: token verification failed', { error: err.message, url: req.originalUrl, ip: req.ip });
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
