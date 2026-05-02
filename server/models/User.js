const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    initial: String,
    name: { type: String, required: true },
    fatherName: String,
    motherName: String,
    nickname: String,
    spouseName: String,
    occupation: String,
    location: String,
    street: String,
    mobile: String,
    email: { type: String, sparse: true, unique: true },
    passwordHash: { type: String },
    remarks: String,
    role: { type: String, enum: ["party", "admin", "user"], default: "user" },
    subscriptionExpiry: { type: Date },
    activeSessions: [{ type: String }], // To track up to 3 active tokens/sessions
    profilePhoto: String,
    qrCode: String,
    otpCode: String,
    otpExpiry: Date,
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "dark" },
    webAuthnCredentials: [
      {
        // For fingerprint/biometric login
        credentialID: Buffer,
        credentialPublicKey: Buffer,
        counter: Number,
        transports: [String],
      },
    ],
  },
  { timestamps: true },
);

userSchema.index({ name: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
