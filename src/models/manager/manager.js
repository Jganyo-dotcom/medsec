const mongoose = require("mongoose");

const managerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      default: "5555555555",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: "manager",
      enum: ["manager", "superior manager"],
    },
    password: {
      type: String,
      required: true,
    },
    hasBeenApproved: {
      type: Boolean,
      default: false,
    },
    resetPasswordApproved: {
      type: String,
      default: "N/A",
      enum: ["awaiting", "done", "N/A"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Manager", managerSchema);
