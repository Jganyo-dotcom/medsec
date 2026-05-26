const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  getHospitalById,
  deleteHospitalById,
  disableHospital,
  enableHospital,
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
  getProfile,
  verifyToken,
  getAllPotentialManagers,
  approveManager,
  getUser,
  updateUser,
  changePassword,
} = require("../../controllers/managers contoller/hospitalCreation");
const authmiddleware = require("../../middlewears/auth");

const router = express.Router();
router.get("/managers", authmiddleware, getAllManagers); // get all
router.get("/pending-managers", authmiddleware, getAllPotentialManagers);
router.get("/hospitals/:id", authmiddleware, getHospitalById);
router.patch("/approve-manager/:id", authmiddleware, approveManager);
router.get("/me", authmiddleware, getProfile);
router.post("/register-manager", authmiddleware, registerManager);
router.post("/login-manager", loginManager);
router.get("/login-history", authmiddleware, getAllLoginHistory);
router.delete("/delete-manager/:id", authmiddleware, deleteManager);
router.post("/reset-password", authmiddleware, resetManagerPassword);
router.post("/register-hospital", authmiddleware, registerHospital);
router.post("/login-hospital", loginHospital); // login hospital
router.post("/verify-login", verifyHospitalLogin);
router.get("/get-hospitals", authmiddleware, getAllHospitals); // get all
router.get("/manager/settings", authmiddleware, getUser);
router.patch("/update-manager/settings", authmiddleware, updateUser);
router.patch("/manager/change-password", authmiddleware, changePassword);
router.delete("/delete-hospital/:id", authmiddleware, deleteHospitalById);
router.patch("/disable-hospital/:id", authmiddleware, disableHospital);
router.patch("/enable-hospital/:id", authmiddleware, enableHospital);
///////
router.get("/get-active-hospitals", authmiddleware, IsactiveHospital); // to get the inactive hospital
router.get("/get-inactive-hospitals", authmiddleware, getInactiveHospitals); //to get the inactive hospital
router.get(
  "/send-hospital-details/:hospitalId",
  authmiddleware,
  sendHospitalDetails,
);
router.patch("/hospital-update/:id", authmiddleware, updateHospital); // send hospital details to admin
router.get("/revoke-access/:Id", authmiddleware, revokeHospitalAdminAccess); // revoke hospital

router.post("/verify-token", authmiddleware, verifyToken);

//router.get("/total-staff", getTotalStaff);

module.exports = router;
