const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    fileName: { type: String, required: true }, // original file name
    fileType: { type: String, required: true }, // e.g. "image/jpeg", "application/pdf"
    filePath: { type: String, required: true }, // storage path or URL
    category: {
      type: String,
      enum: ["Wound Image", "Ultrasound", "Lab Chart", "Other"],
      default: "Other",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT", // link back to hospital
      required: true,
    }, // clinician ID or name
    notes: { type: String }, // optional description
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attachment", attachmentSchema);
