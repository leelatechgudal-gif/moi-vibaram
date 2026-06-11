const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: { type: String, required: true, default: () => uuidv4(), index: true },
    tenantRole: { type: String, enum: ["owner", "member"], default: "owner" },
    mobile: String,
    email: { type: String, required: true, unique: true },
    clerkId: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    location: String,
    street: String,
    fatherName: String,
    motherName: String,
    spouseName: String,
    nickname: String,
    occupation: String,
    role: { type: String, enum: ["admin", "member", "clerk"], default: "member" },
    subscriptionExpiry: { type: Date },
    activeSessions: [{ type: String }],
    profilePhoto: String,
    qrCode: String,
    otpCode: String,
    otpExpiry: Date,
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "dark" },
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
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
