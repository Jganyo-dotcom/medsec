const HospitalIT = require("../../models/HospitalIT"); // adjust path

const getFullMedicalRecords = async (req, res) => {
  try {
    const { hospitalId, patientId } = req.params;

    // Find hospital by ID
    const hospital =
      await HospitalIT.findById(hospitalId).select("patientRecords");
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    // Find the specific patient record inside hospital.patientRecords
    const patientRecord = hospital.patientRecords.id(patientId);
    if (!patientRecord) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // Return the full patient record
    return res.status(200).json({
      message: "Full medical record retrieved successfully",
      patientRecord,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while retrieving medical record" });
  }
};

// Get prescriptions for a specific patient
const getPatientPrescriptions = async (req, res) => {
  try {
    const { hospitalId, patientId } = req.params;

    // Find hospital by ID
    const hospital =
      await HospitalIT.findById(hospitalId).select("patientRecords");
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    // Find the specific patient record
    const patientRecord = hospital.patientRecords.id(patientId);
    if (!patientRecord) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // Return only prescriptions
    return res.status(200).json({
      message: "Prescriptions retrieved successfully",
      prescriptions: patientRecord.prescriptions || [],
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while retrieving prescriptions" });
  }
};

// Get clinical input for a specific patient
const getPatientClinicalInput = async (req, res) => {
  try {
    const { hospitalId, patientId } = req.params;

    // Find hospital by ID
    const hospital =
      await HospitalIT.findById(hospitalId).select("patientRecords");
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    // Find the specific patient record
    const patientRecord = hospital.patientRecords.id(patientId);
    if (!patientRecord) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // Return only clinical input
    return res.status(200).json({
      message: "Clinical input retrieved successfully",
      clinicalInput: patientRecord.clinicalInput || {},
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while retrieving clinical input" });
  }
};

// Get investigations for a specific patient
const getPatientInvestigations = async (req, res) => {
  try {
    const { hospitalId, patientId } = req.params;

    // Find hospital by ID
    const hospital =
      await HospitalIT.findById(hospitalId).select("patientRecords");
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    // Find the specific patient record
    const patientRecord = hospital.patientRecords.id(patientId);
    if (!patientRecord) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // Return only investigations
    return res.status(200).json({
      message: "Investigations retrieved successfully",
      investigations: patientRecord.investigations || [],
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while retrieving investigations" });
  }
};

module.exports = {
  getFullMedicalRecords,
  getPatientInvestigations,
  getPatientClinicalInput,
  getPatientPrescriptions,
  getFullMedicalRecords,
};
