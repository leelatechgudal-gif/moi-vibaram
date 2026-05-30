const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventName: { type: String, required: true },
    category: { type: String, default: 'Standard' }, // To support "Other" category
    labels: [{ type: String }],
    date: { type: Date, required: true },
    venue: String,
    location: String,
    city: String,
    invitationFile: String,
    isLiveLedger: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
