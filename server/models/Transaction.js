const mongoose = require('mongoose');

const seerVarisaiSchema = new mongoose.Schema({
    dress: { value: Number, quantity: Number, remarks: String },
    thattuVarisai: { value: Number, quantity: Number, remarks: String },
    jewels: { type: String, value: Number, quantity: Number, remarks: String },
    marakkal: { value: Number, quantity: Number, remarks: String },
    maalai: { value: Number, quantity: Number, remarks: String },
    arisMootai: { value: Number, quantity: Number, remarks: String },
    paathirangal: { value: Number, quantity: Number, remarks: String },
    others: { value: Number, quantity: Number, remarks: String },
}, { _id: false });

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // Optional for 'paid' transactions
    eventName: String, // Used when eventId is not available (typically for 'paid' transactions)
    partyName: { type: String, required: true },
    initial: String,
    fatherName: String,
    motherName: String,
    spouseName: String,
    nickname: String,
    occupation: String,
    location: String,
    street: String,
    mobile: String,
    type: { type: String, enum: ['received', 'paid'], required: true },
    cashAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    thaiMama: { type: Boolean, default: false },
    labels: [{ type: String }], // For user-defined labels/groups
    seerVarisai: seerVarisaiSchema,
    remarks: String,
    editHistory: [{ // Audit log for modifications
        editedAt: { type: Date, default: Date.now },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changes: mongoose.Schema.Types.Mixed // Store what was changed
    }],
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
