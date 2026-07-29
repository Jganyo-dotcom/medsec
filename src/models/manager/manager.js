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
      default: "MIST MANAGER",
      enum: ["MIST DEVELOPER", "superior manager", "MIST MANAGER"],
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
    hasChangedPassword:{
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("Manager", managerSchema);
