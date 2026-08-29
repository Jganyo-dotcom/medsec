const medicineSchema = new mongoose.Schema(
  {
    presentingComplaint: { type: String },
    historyOfPresentingComplaint: { type: String },
    familyHistory: { type: String }, // e.g. ["HTN", "SCD"]
    pastMedicalHistory:{ type: String },
    social: { type: String },
    drugAllergy: { type: String },
    reviewOfSystems: { type: String },
    examination: {
      general: { type: String },
      cardiovascular: { type: String },
      respiratory: { type: String },
      abdominal: { type: String },
      neurological: { type: String },
      otherSystems: { type: String },
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
    presentingComplaint: { type: String },
    historyOfPresentingComplaint: { type: String },
    pastObstetricHistory: { type: String },
    gynaecologicalHistory: { type: String },
    pastMedicalHistory: { type: String },
    familySocialHistory: { type: String },
    drugHistory: { type: String },
    summary: { type: String },
    examination: {
      general: { type: String },
      abdominal: { type: String },
      symphysiofundalHeight: { type: String },
      fetalHeartRate: { type: String },
      obstetricSpecific: { type: String },
    },
  },
  { timestamps: true },
);

const gynaecologySchema = new mongoose.Schema(
  {
    biodata: { type: String },
    presentingComplaint: { type: String },
    historyOfPresentingComplaint: { type: String }, // 5Cs
    gynaecologicalHistory: { type: String },
    obstetricHistory: { type: String },
    pastMedicalHistory: { type: String },
    familySocialHistory: { type: String },
    summary: { type: String },
    examination: {
      general: { type: String },
      abdominal: { type: String },
      pelvic: { type: String },
    },
  },
  { timestamps: true },
);

const pediatricsSchema = new mongoose.Schema(
  {
    biodata: { type: String }, // NASRATI
    presentingComplaints: { type: String },
    historyOfPresentingComplaint: { type: String }, // 5Cs
    pastMedicalHistory: { type: String },
    prenatalHistory: { type: String },
    natalHistory: { type: String },
    postnatalHistory: { type: String },
    dietaryHistory: { type: String },
    immunizationHistory: [{ type: String }], // dropdowns for NPI schedule
    developmentalMilestones: {
      grossMotor: { type: String },
      fineMotor: { type: String },
      verbal: { type: String },
      social: { type: String },
    },
    familySocialHistory: { type: String },
    reviewOfSystems: { type: String },
    drugAllergyHistory: { type: String },
    summary: { type: String },
    examination: {
      general: { type: String },
      anthropometry: { type: String },
      systemic: {
        cardiovascular: { type: String },
        respiratory: { type: String },
        abdominal: { type: String },
        neurological: { type: String },
        skin: { type: String },
        ent: { type: String },
      },
    },
  },
  { timestamps: true },
);

const surgerySchema = new mongoose.Schema(
  {
    biodata: { type: String },
    presentingComplaints: { type: String }, // chronological
    historyOfPresentingComplaints: { type: String }, // SCS
    pastMedicalHistory: { type: String },
    familySocialHistory: { type: String },
    drugHistory: { type: String },
    reviewOfSystems: { type: String },
    summary: { type: String },
    examination: {
      general: { type: String },
      abdominal: { type: String },
      limbJoints: { type: String },
      neurological: { type: String },
    },
  },
  { timestamps: true },
);

const dtemplateSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    medicine: [medicineSchema],
    obstetrics: [obstetricsSchema],
    gynaecology: [gynaecologySchema],
    pediatrics: [pediatricsSchema],
    surgery: [surgerySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("DTemplate", dtemplateSchema);
