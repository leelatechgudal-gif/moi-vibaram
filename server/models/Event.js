const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventName: { type: String, required: true },
    date: { type: Date, required: true },
    venue: String,
    location: String,
    city: String,
    invitationFile: String,
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
