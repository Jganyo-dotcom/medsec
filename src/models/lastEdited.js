const mongoose = require("mongoose");

const lastEditedSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    },
    editedWho: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "editedModel",
      required: true,
    },
    editedModel: {
      type: String,
      enum: ["Patient", "HospitalIT"],
      default: "Ordered",
    },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("lastEdited", lastEditedSchema);
