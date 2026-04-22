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
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  subscriptionExpiry: { type: Date },
  activeSessions: [{ type: String }], // To track up to 3 active tokens/sessions
  profilePhoto: String,
  qrCode: String,
  otpCode: String,
  otpExpiry: Date,
  webAuthnCredentials: [{ // For fingerprint/biometric login
    credentialID: Buffer,
    credentialPublicKey: Buffer,
    counter: Number,
    transports: [String]
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
