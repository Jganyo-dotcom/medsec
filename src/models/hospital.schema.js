const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema(
  {
    hospitalDetails: {
      name: { type: String, required: true },
      code: { type: String, required: true, default: 3, unique: true },
      addresse: { type: String, unique: true, required: true },
      contact: {
        phone: { type: String, unique: true, required: true },
        email: { type: String, unique: true, required: true },
      },
    },

    hospitalRep: {
      name: { type: String, required: true },
      phone: { type: String, unique: true, required: true },
      email: { type: String, unique: true, required: true },
      password: { type: String, minlength: 6, required: true },
      role: { type: String, enum: ["Super Admin"], required: true },
    },

    hasChangedPassword: { type: Boolean, default: false },
    isdisabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

//  Export as a model
module.exports = mongoose.model("Hospital", HospitalSchema);
