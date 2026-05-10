const mongoose = require('mongoose');

const adminWhitelistSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AdminWhitelist', adminWhitelistSchema);
