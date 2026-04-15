const express = require("express");
const {
  createPatient,
  getAllPatients,
} = require("../../controllers/patientManagemant/module1");
const authmiddleware = require("../../middlewears/auth");

const router = express.Router();

router.post("/create-patients", authmiddleware, createPatient);
router.get("/getAll-patient", authmiddleware, getAllPatients);
module.exports = router;
