// models/Setting.js
const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    twoFA: { type: Boolean, default: true },
    passwordPolicy: { type: Boolean, default: true },
    sessionTimeout: { type: String, default: "30 minutes" },
    lockoutAttempts: { type: String, default: "5 attempts" },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Setting", settingSchema);
