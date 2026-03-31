const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  deleteHospitalById,
  disableHospital,
  IsactiveHospital,
  getInactiveHospitals,
  sendHospitalDetails,
  revokeHospitalAdminAccess,
  // getTotalStaff,
  loginHospital,
  verifyHospitalLogin,
} = require("../../controllers/managers contoller/hospitalCreation");

const router = express.Router();

router.post("/register-hospital", registerHospital); // register hospital
router.post("/login-hospital", loginHospital); // login hospital
router.post("/verify-login", verifyHospitalLogin); //veri hospital
router.get("/get-hospitals", getAllHospitals); // get all
router.delete("/delete-hospital/:id", deleteHospitalById); // delete hospital
router.patch("/disable-hospital/:id", disableHospital); // disable hospital
///////
router.get("/get-inactive-hospitals", IsactiveHospital); // to get the inactive hospital
router.get("/get-inactive-hospitals", getInactiveHospitals); //to get the inactive hospital
router.get("/send-hospital-details/:hospitalId", sendHospitalDetails); // send hospital details to admin
router.get("/revoke-access/:id", revokeHospitalAdminAccess); // revoke hospital
// router.get("/total-staff", getTotalStaff); // revoke hospital

module.exports = router;
