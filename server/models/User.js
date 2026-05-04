const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: { type: String, required: true, default: () => uuidv4(), index: true },
    tenantRole: { type: String, enum: ["owner", "member"], default: "owner" },
    mobile: String,
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    location: String,
    street: String,
    role: { type: String, enum: ["admin", "user"], default: "user" },
    subscriptionExpiry: { type: Date },
    activeSessions: [{ type: String }],
    profilePhoto: String,
    qrCode: String,
    otpCode: String,
    otpExpiry: Date,
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "dark" },
    isDeleted: { type: Boolean, default: false },
    webAuthnCredentials: [
      {
        credentialID: Buffer,
        credentialPublicKey: Buffer,
        counter: Number,
        transports: [String],
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
