const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fatherName: String,
  motherName: String,
  nickname: String,
  spouseName: String,
  occupation: String,
  location: { type: String, required: true },
  street: String,
  mobile: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  profilePhoto: String,
  qrCode: String,
  otpCode: String,
  otpExpiry: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
