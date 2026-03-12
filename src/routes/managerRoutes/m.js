const express = require("express");
const {
  registerHospital,
  getAllHospitals,
} = require("../../controllers/managers contoller/hospitalCreation");

const router = express.Router();

router.post("/register-hospital", registerHospital);// register hospital
router.get("/get-hospitals", getAllHospitals);// get all

module.exports = router;


