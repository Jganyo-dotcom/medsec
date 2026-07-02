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
  getAllLogs,
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
  approveManagerCredentials,
  resetManagerPasswordReset,
  archiveHospital,
  loginMistDeveloper
} = require("../../controllers/managers contoller/hospitalCreation");
const authmiddleware = require("../../middlewears/auth");
const { OnlySuperiorManager, higherAuth2, higherAuth } = require("../../middlewears/role");

const router = express.Router();
router.get("/managers", authmiddleware,higherAuth2, getAllManagers); // get all
router.get("/pending-managers", authmiddleware,OnlySuperiorManager, getAllPotentialManagers);
router.get("/hospitals/:id", authmiddleware,higherAuth2, getHospitalById);
router.patch("/approve-manager/:id", authmiddleware, OnlySuperiorManager,approveManager);
router.patch("/approve-reset/:id", authmiddleware,OnlySuperiorManager, approveManagerCredentials);
router.get("/pending-resets", authmiddleware,higherAuth2, resetManagerPasswordReset);
router.get("/me", authmiddleware,higherAuth, getProfile);
router.post("/register-manager", authmiddleware,higherAuth2, registerManager);
router.post("/login-manager", loginManager);
router.post("/login-mist-developer", loginMistDeveloper);
router.get("/login-history", authmiddleware,higherAuth2, getAllLoginHistory);
router.delete("/delete-manager/:id", authmiddleware,higherAuth2, deleteManager);
router.post("/reset-password", authmiddleware,higherAuth2, resetManagerPassword);
router.post("/register-hospital", authmiddleware,higherAuth, registerHospital);
router.post("/login-hospital", loginHospital); // login hospital
router.post("/verify-login", verifyHospitalLogin);
router.get("/get-hospitals", authmiddleware,higherAuth, getAllHospitals); // get all
router.get("/manager/settings", authmiddleware,higherAuth, getUser);
router.patch("/update-manager/settings", authmiddleware,higherAuth, updateUser);
router.patch("/manager/change-password", authmiddleware,higherAuth, changePassword);
router.delete("/delete-hospital/:id", authmiddleware,OnlySuperiorManager, deleteHospitalById);
router.patch("/disable-hospital/:id", authmiddleware,higherAuth, disableHospital);
router.patch("/enable-hospital/:id", authmiddleware, higherAuth,enableHospital);
///////
router.get("/achieve-hospitals/:id", authmiddleware,higherAuth, archiveHospital); 
router.get("/get-active-hospitals", authmiddleware,higherAuth, IsactiveHospital); // to get the inactive hospital
router.get("/get-inactive-hospitals", authmiddleware,higherAuth, getInactiveHospitals); //to get the inactive hospital
router.get("/get-all-logs",authmiddleware,higherAuth,getAllLogs);// get all logs
router.get(
  "/send-hospital-details/:hospitalId",
  authmiddleware,
  higherAuth,
  sendHospitalDetails,
);
router.patch("/hospital-update/:id", authmiddleware,higherAuth, updateHospital); // send hospital details to admin
router.get("/revoke-access/:Id", authmiddleware,higherAuth, revokeHospitalAdminAccess); // revoke hospital

router.post("/verify-token", authmiddleware, verifyToken);

//router.get("/total-staff", getTotalStaff);

module.exports = router;
