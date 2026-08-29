const mongoose = require("mongoose");

const ITactionLogSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    // Performer: Always an IT staff member
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
    },
    action: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: "Successful" },

    // Receiver / Target: Dynamically references Patient OR HospitalIT
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "entityType",
    },
    entityType: {
      type: String,
      enum: ["Patient", "HospitalIT"],
    },

    // Kept for backward compatibility with existing saved documents
    path: {
      type: String,
      enum: ["Patient", "HospitalIT"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ITActionLog", ITactionLogSchema);
