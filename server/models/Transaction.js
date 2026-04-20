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
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    partyName: { type: String, required: true },
    spouseName: String,
    nickname: String,
    occupation: String,
    location: String,
    street: String,
    mobile: String,
    type: { type: String, enum: ['received', 'paid'], required: true },
    cashAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    seerVarisai: seerVarisaiSchema,
    remarks: String,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
