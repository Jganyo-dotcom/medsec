const mongoose = require("mongoose");

const HospitalITSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital", // link back to the main hospital record
      required: true,
    },

    hospitalCode: { type: String, required: true },

    // Array of staff accounts
    staffAccounts: {
      name: { type: String, required: true },
      department: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      phone: { type: String, unique: true, required: true },
      role: {
        type: String,
        enum: ["Doctor", "Nurse", "Technician", "IT Admin"],
        required: true,
      },
      password: { type: String, minlength: 6, required: true },
      active: { type: Boolean, default: true },
      hasChangedPassword: { type: Boolean, default: true },
    },

    // Array of patient records
    patientRecords: [
      {
        name: { type: String, required: true },
        dob: { type: Date, required: true },
        gender: {
          type: String,
          enum: ["Male", "Female", "Other"],
          required: true,
        },
        medicalHistory: { type: String },
        admitted: { type: Boolean, default: false },
      },
    ],

    // Array of system logs
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
