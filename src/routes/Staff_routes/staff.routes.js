const express = require("express");
const {
  registerStaff,
  editStaffById,
  disableStaff,
  resetStaffPassword,
  getAllStaff,
  deleteStaffById,
  loginStaff,
  verifyStaffLogin,
  getInactiveStaff,
  getActiveStaff,
  sendStaffDetails,
  revokeStaffAccess
} = require("../../controllers/staff controller/staffController");

const router = express.Router();

router.post("/register-staff", registerStaff); // register staff
router.post("/login-staff", loginStaff); // login staff
router.post("/verify-login", verifyStaffLogin); // verify staff
router.get("/get-staffs", getAllStaff); // get all
router.delete("/delete-staff/:id", deleteStaffById); // delete staff
router.patch("/disable-staff/:id", disableStaff); // disable staff
router.put("/edit-staff/:id", editStaffById); // edit staff
router.patch("/reset-staff-password/:id", resetStaffPassword); // reset staff password
router.get("/get-inactive-staffs", getInactiveStaff); // get inactive staffs
router.get("/get-active-staffs", getActiveStaff); // get active staffs
router.get("/send-staff-details/:staffId", sendStaffDetails); // send staff details
router.get("/revoke-access/:id", revokeStaffAccess); // revoke staff

module.exports = router;
