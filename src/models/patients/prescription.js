const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    drug: { type: String, required: true },
    dose: { type: String, required: true }, // e.g. "500mg"
    route: { type: String, required: true }, // e.g. "Oral", "IV"
    frequency: { type: String, required: true }, // e.g. "Twice daily"
    duration: { type: String, required: true }, // e.g. "7 days"

    // Safety checks
    allergyAlert: { type: Boolean, default: false },
    interactionAlert: { type: Boolean, default: false },

    // Workflow status
    status: {
      type: String,
      enum: ["Pending Verification", "Available", "Dispensed"],
      default: "Pending Verification",
    },

    pharmacistNotes: { type: String },
    drugChart: { type: String }, // file path or URL to uploaded chart

 // doctor
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT", // link back to hospital
      required: true,
    }, // pharmacist ID or name
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
