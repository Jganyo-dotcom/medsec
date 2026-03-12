const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  deleteHospitalById,
} = require("../../controllers/managers contoller/hospitalCreation");

const router = express.Router();

router.post("/register-hospital", registerHospital);// register hospital
router.get("/get-hospitals", getAllHospitals);// get all
router.delete("/delete-hospital/:id", deleteHospitalById);// delete hospital

module.exports = router;


