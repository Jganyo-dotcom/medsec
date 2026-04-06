const mongoose = require("mongoose");

const whoDeletedSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    },
    editedWho: {
      type: String,
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    role: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("whoDeleted", whoDeletedSchema);
