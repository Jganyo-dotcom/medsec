const express = require("express");
const {
  resetStaffPassword,
  getAllStaff,
  deleteStaffById,
  loginStaff,
  verifyStaffLogin,
  getInactiveStaff,
  getActiveStaff,
  sendStaffDetails,
  revokeStaffAccess,
  disableStaff,
  registerStaff,
  editStaffById,
} = require("../../controllers/it_department/staffController");
const authmiddleware = require("../../middlewears/auth");

const router = express.Router();

router.post("/register-staff", authmiddleware, registerStaff); // register staff
router.post("/login-staff", loginStaff); // login staff
router.post("/verify-login", verifyStaffLogin); // verify staff
router.get("/get-staffs",authmiddleware, getAllStaff); // get all
router.delete("/delete-staff/:hospitalId", authmiddleware,deleteStaffById); // delete staff
router.patch("/disable-staff/:hospitalId/:staffId",authmiddleware, disableStaff); // disable staff
router.patch("/edit-staff/:id",authmiddleware, editStaffById); // edit staff
router.patch("/reset-staff-password/:hospitalId/:staffId",authmiddleware, resetStaffPassword); // reset staff password
router.get("/get-inactive-staffs",authmiddleware, getInactiveStaff); // get inactive staffs
router.get("/get-active-staffs",authmiddleware, getActiveStaff); // get active staffs
router.get("/send-staff-details/:staffId",authmiddleware, sendStaffDetails); // send staff details
router.get("/revoke-access/:id",authmiddleware, revokeStaffAccess); // revoke staff

module.exports = router;
