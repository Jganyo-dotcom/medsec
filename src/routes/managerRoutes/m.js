const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  deleteHospitalById,
  disableHospital,
} = require("../../controllers/managers contoller/hospitalCreation");

const router = express.Router();

router.post("/register-hospital", registerHospital); // register hospital
router.get("/get-hospitals", getAllHospitals); // get all
router.delete("/delete-hospital/:id", deleteHospitalById); // delete hospital
router.patch("/disable-hospital/:id", disableHospital); // disable hospital

module.exports = router;
