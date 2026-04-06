const medicineSchema = new mongoose.Schema(
  {
    presentingComplaint: String,
    historyOfPresentingComplaint: String,
    pastMedicalHistory: [String], // e.g. ["HTN", "DM", "Asthma"]
    familyHistory: [String], // e.g. ["HTN", "SCD"]
    socialHistory: String,
    drugAllergyHistory: String,
    reviewOfSystems: String,
    examination: {
      general: String,
      cardiovascular: String,
      respiratory: String,
      abdominal: String,
      neurological: String,
      otherSystems: String,
    },
  },
  { timestamps: true },
);

const obstetricsSchema = new mongoose.Schema(
  {
    reasonForVisit: {
      type: String,
      enum: ["Booking", "Routine", "Delivery", "Postpartum", "New Complaint"],
    },
    presentingComplaint: String,
    historyOfPresentingComplaint: String,
    pastObstetricHistory: String,
    gynaecologicalHistory: String,
    pastMedicalHistory: String,
    familySocialHistory: String,
    drugHistory: String,
    summary: String,
    examination: {
      general: String,
      abdominal: String,
      symphysiofundalHeight: String,
      fetalHeartRate: String,
      obstetricSpecific: String,
    },
  },
  { timestamps: true },
);

const gynaecologySchema = new mongoose.Schema(
  {
    biodata: String,
    presentingComplaint: String,
    historyOfPresentingComplaint: String, // 5Cs
    gynaecologicalHistory: String,
    obstetricHistory: String,
    pastMedicalHistory: String,
    familySocialHistory: String,
    summary: String,
    examination: {
      general: String,
      abdominal: String,
      pelvic: String,
    },
  },
  { timestamps: true },
);

const pediatricsSchema = new mongoose.Schema(
  {
    biodata: String, // NASRATI
    presentingComplaints: String,
    historyOfPresentingComplaint: String, // 5Cs
    pastMedicalHistory: String,
    prenatalHistory: String,
    natalHistory: String,
    postnatalHistory: String,
    dietaryHistory: String,
    immunizationHistory: [String], // dropdowns for NPI schedule
    developmentalMilestones: {
      grossMotor: String,
      fineMotor: String,
      verbal: String,
      social: String,
    },
    familySocialHistory: String,
    reviewOfSystems: String,
    drugAllergyHistory: String,
    summary: String,
    examination: {
      general: String,
      anthropometry: String,
      systemic: {
        cardiovascular: String,
        respiratory: String,
        abdominal: String,
        neurological: String,
        skin: String,
        ent: String,
      },
    },
  },
  { timestamps: true },
);

const surgerySchema = new mongoose.Schema(
  {
    biodata: String,
    presentingComplaints: String, // chronological
    historyOfPresentingComplaints: String, // SCS
    pastMedicalHistory: String,
    familySocialHistory: String,
    drugHistory: String,
    reviewOfSystems: String,
    summary: String,
    examination: {
      general: String,
      abdominal: String,
      limbJoints: String,
      neurological: String,
    },
  },
  { timestamps: true },
);

const dtemplateSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient", // link back to patient
      required: true,
    },
    // Embed department-specific clerking templates
    medicine: [medicineSchema],
    obstetrics: [obstetricsSchema],
    gynaecology: [gynaecologySchema],
    pediatrics: [pediatricsSchema],
    surgery: [surgerySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("DTemplate", dtemplateSchema);
