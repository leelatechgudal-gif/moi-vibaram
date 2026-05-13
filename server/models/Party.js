const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
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
    remarks: String,
    qrCode: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

partySchema.index({ tenantId: 1, name: 1, initial: 1, spouseName: 1, location: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model("Party", partySchema);
