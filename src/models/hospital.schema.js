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
    // Temporary login code for OTP verification
    tempLoginCode: { type: String }, // optional, only set when login is attempted
    tempLoginExpires: { type: Date }, // store as Date for easy expiry checks

    hospitalRep: {
      name: { type: String, required: true },
      phone: { type: String, unique: true, required: true },
      email: { type: String, unique: true, required: true },
      password: { type: String, minlength: 6, required: true },
      role: { type: String, enum: ["Super Admin"], required: true },
      revokedAccess: { type: Boolean, default: false },
    },
    lastquerry: { type: Number, default: 0 },

    hasChangedPassword: { type: Boolean, default: false },
    isdisabled: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

//  Export as a model
module.exports = mongoose.model("Hospital", HospitalSchema);
