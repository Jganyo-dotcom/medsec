const express = require("express");
const {
  getFullMedicalRecords,
  getPatientClinicalInput,
  getPatientInvestigations,
  getPatientPrescriptions,
} = require("../../controllers/it_department/access");

const { authorize } = require("../../middlewears/authorize");

const router = express.Router();

// Doctor: full patient record
router.get(
  "/hospital/:hospitalId/patient/:patientId/full-record",
  authorize("fullPatientRecord"),
  getFullMedicalRecords,
);

// Nurse: clinical input only
router.get(
  "/hospital/:hospitalId/patient/:patientId/clinical-input",
  authorize("clinicalInput"),
  getPatientClinicalInput,
);

// Lab Scientist: investigations only
router.get(
  "/hospital/:hospitalId/patient/:patientId/investigations",
  authorize("investigations"),
  getPatientInvestigations,
);

// Pharmacist: prescriptions only
router.get(
  "/hospital/:hospitalId/patient/:patientId/prescriptions",
  authorize("prescriptions"),
  getPatientPrescriptions,
);

module.exports = router;
