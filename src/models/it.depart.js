const mongoose = require("mongoose");

// Sub-schemas for role-specific patient data
const ClinicalInputSchema = new mongoose.Schema({
  notes: { type: String },
  vitals: { type: String },
  admitted: { type: Boolean, default: false },
});

const InvestigationSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  result: { type: String },
  date: { type: Date, default: Date.now },
});

const PrescriptionSchema = new mongoose.Schema({
  drugName: { type: String, required: true },
  dosage: { type: String, required: true },
  duration: { type: String },
});

const PatientRecordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },

  // Doctor: full record
  medicalHistory: { type: String },

  // Nurse: limited clinical input
  clinicalInput: ClinicalInputSchema,

  // Lab Scientist: investigations only
  investigations: [InvestigationSchema],

  // Pharmacist: prescriptions only
  prescriptions: [PrescriptionSchema],
});

const HospitalITSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    hospitalCode: { type: String, required: true },

    // Single staff account object
    staffAccounts: {
      name: { type: String, required: true },
      department: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      phone: { type: String, unique: true, required: true },
      role: {
        type: String,
        enum: ["Doctor", "Nurse", "LabScientist", "Pharmacist", "Admin"],
        required: true,
      },
      password: { type: String, minlength: 6, required: true },
      isActive: { type: Boolean, default: true },
      hasChangedPassword: { type: Boolean, default: true },
      resetPassword: { type: Boolean, default: false },
      blocked: { type: Boolean, default: false },
      failedAttempts: { type: Number, default: 0 }, // for login security
    },

    // Role-based patient records
    patientRecords: [PatientRecordSchema],

    // System logs
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
