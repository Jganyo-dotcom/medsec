const mongoose = require("mongoose");

// Sub-schemas for role-specific patient data
const ClinicalInputSchema = new mongoose.Schema({
  notes: { type: String },
  temp: { type: String },
  pulse: { type: String },
  bp: { type: String },
  RR: { type: String },
  watersaturation: { type: Boolean, default: false },
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
  prescribedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HospitalIT", // link back to hospital
    required: true,
  },
});

// Patient schema
const PatientSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    },
    name: { type: String, required: true },
    dob: { type: Date, required: true },
    phone: { type: String, required: true },
    addresse: { type: String, required: true },
    occupation: { type: String, required: true },
    tribe: { type: String, required: true },
    informant: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    // Clinic/Ward assignment
    wardAssignment: { type: String, required: true },

    // Department template flag (used later to load Module 2 forms)
    departmentTemplate: {
      type: String,
      enum: ["Medicine", "Obstetrics", "Gynaecology", "Pediatrics", "Surgery"],
      required: true,
    },
    medicalHistory: { type: String },

    clinicalInput: ClinicalInputSchema,
    investigations: [InvestigationSchema],
    prescriptions: [PrescriptionSchema],

    active: { type: Boolean, default: true },

    dtemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DTemplate",
    },
    drugprescriptions: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    attaachements: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attachment",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", PatientSchema);
