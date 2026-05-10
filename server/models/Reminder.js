const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    name: { type: String, required: true },
    location: { type: String },
    eventName: { type: String, required: true },
    notes: { type: String },
    date: { type: Date, required: true },
    notifyOnLogin: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
