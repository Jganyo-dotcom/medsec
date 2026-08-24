const mongoose = require("mongoose");

const ITactionLogSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId },
    path: { type: String, enum: ["Patient", "HospitalIT"] },
    action: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: "Successful" }, // Added field
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityType: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ITActionLog", ITactionLogSchema);
