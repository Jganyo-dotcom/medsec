const Hematology = new mongoose.Schema({
  testName: { type: String, required: true }, // e.g. CBC, ESR
  result: { type: String },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  priority: { type: String, enum: ["Routine", "Urgent"], default: "Routine" },
});

const Microbiology = new mongoose.Schema({
  specimen: { type: String, required: true }, // e.g. Blood, Urine, Stool
  cultureResult: { type: String },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  priority: { type: String, enum: ["Routine", "Urgent"], default: "Routine" },
});

const Radiology = new mongoose.Schema({
  imagingType: { type: String, required: true }, // e.g. X-ray, Ultrasound, CT, MRI
  bodyPart: { type: String }, // e.g. Chest, Abdomen
  findings: { type: String },
  date: { type: Date, default: Date.now },
  priority: { type: String, enum: ["Routine", "Urgent"], default: "Routine" },
});

const Histopathology = new mongoose.Schema({
  specimenType: { type: String, required: true }, // e.g. Tissue biopsy, Cytology
  result: { type: String },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  priority: { type: String, enum: ["Routine", "Urgent"], default: "Routine" },
});

const PatientTestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    hematology: [Hematology],
    microbiology: [Microbiology],
    radiology: [Radiology],
    histopathology: [Histopathology],
    status: {
      type: String,
      enum: ["Ordered", "In Queue", "Completed"],
      default: "Ordered",
    },
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    }, // clinician name or ID
    result: { type: String }, // free text or structured JSON
    resultDate: { type: Date },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalIT",
      required: true,
    }, 
    alertSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PatientTest", PatientTestSchema);
