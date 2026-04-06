const mongoose = require("mongoose");

const HospitalITSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    loginHistory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "loginHistory",
      default: "N/A",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      default: "N/A",
    },

    hospitalCode: { type: String, required: true },

    // Single staff account object
    staffAccounts: {
      name: { type: String, required: true },
      department: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      phone: { type: String, unique: true, required: true },
      role: {
        type: String,
        enum: ["Doctor", "Nurse", "LabScientist", "Pharmacist", "Admin"],
        required: true,
      },
      password: { type: String, minlength: 6, required: true },
      isActive: { type: Boolean, default: true },
      hasChangedPassword: { type: Boolean, default: false },
      resetPassword: { type: Boolean, default: false },
      blocked: { type: Boolean, default: false },
      isAdminDisabled: { type: Boolean, default: false },
      failedAttempts: { type: Number, default: 0 }, // for login security
    },

    // System logs
    systemLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HospitalIT", HospitalITSchema);
