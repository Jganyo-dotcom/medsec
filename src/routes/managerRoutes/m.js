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
  updateHospital,
  registerManager,
  loginManager,
  getAllManagers,
  resetManagerPassword,
  deleteManager,
  getAllLoginHistory,
} = require("../../controllers/managers contoller/hospitalCreation");
const authmiddleware = require("../../middlewears/auth");

const router = express.Router();
router.get("/managers", authmiddleware, getAllManagers); // get all
router.post("/register-manager", authmiddleware, registerManager); // register hospital
router.post("/login-manager", loginManager);
router.get("/login-history", authmiddleware, getAllLoginHistory); // get all
router.delete("/delete-manager/:id", authmiddleware, deleteManager);
router.post("/reset-password",authmiddleware, resetManagerPassword);
router.post("/register-hospital", registerHospital); // register hospital
router.post("/login-hospital", loginHospital); // login hospital
router.post("/verify-login", verifyHospitalLogin); //veri hospital
router.get("/get-hospitals", getAllHospitals); // get all
router.delete("/delete-hospital/:id", deleteHospitalById); // delete hospital
router.patch("/disable-hospital/:id", disableHospital); // disable hospital
///////
router.get("/get-active-hospitals", IsactiveHospital); // to get the inactive hospital
router.get("/get-inactive-hospitals", getInactiveHospitals); //to get the inactive hospital
router.get("/send-hospital-details/:hospitalId", sendHospitalDetails);
router.patch("/hospital-update/:id", updateHospital); // send hospital details to admin
router.get("/revoke-access/:Id", revokeHospitalAdminAccess); // revoke hospital

//router.get("/total-staff", getTotalStaff);

module.exports = router;
