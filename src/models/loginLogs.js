const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    },
    date: { type: Date, required: true },
    time:{type:String , required:true}
  },
  { timestamps: true },
);

module.exports = mongoose.model("loginHistory", loginHistorySchema);
