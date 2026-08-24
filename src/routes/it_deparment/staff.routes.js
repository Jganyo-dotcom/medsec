const express = require("express");
const {
  resetStaffPassword,
  getAllStaff,
  deleteStaffById,
  loginStaff,
  verifyStaffOTP,
  getInactiveStaff,
  getActiveStaff,
  sendStaffDetails,
  revokeStaffAccess,
  disableStaff,
  registerStaff,
  editStaffById,
  getStaffById,
  getActivityLogs,
} = require("../../controllers/it_department/staffController");
const authmiddleware = require("../../middlewears/auth");
const {
  resetPasswordforAccount,
  toggleBlockAccount,
} = require("../../controllers/it_department/Account_control");

const router = express.Router();

router.post("/register-staff", authmiddleware, registerStaff); // register staff
router.post("/login-it-Admin/staffMember", loginStaff); // login staff
router.get("/activity-logs", authmiddleware, getActivityLogs); // get inactive staffs
router.post("/verify-login", verifyStaffOTP); // verify staff
router.get("/get-staffs", authmiddleware, getAllStaff); // get all
router.get("/staff/:id", authmiddleware, getStaffById);
router.patch("/staff/:id/reset-password", resetPasswordforAccount);

// Block staff account
router.patch("/staff/:id/toggle-block", authmiddleware, toggleBlockAccount);

router.delete("/delete-staff/:hospitalId", authmiddleware, deleteStaffById); // delete staff
router.patch(
  "/disable-staff/:hospitalId/:staffId",
  authmiddleware,
  disableStaff,
); // disable staff
router.patch("/staff/:staffId/update", authmiddleware, editStaffById); // edit staff
router.patch(
  "/reset-staff-password/:hospitalId/:staffId",
  authmiddleware,
  resetStaffPassword,
); // reset staff password
router.get("/get-inactive-staffs", authmiddleware, getInactiveStaff); // get inactive staffs
router.get("/get-active-staffs", authmiddleware, getActiveStaff); // get active staffs
router.get("/send-staff-details/:staffId", authmiddleware, sendStaffDetails); // send staff details
router.get("/revoke-access/:id", authmiddleware, revokeStaffAccess); // revoke staff

module.exports = router;
