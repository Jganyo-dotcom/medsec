const express = require("express");
const {
  resetPasswordforAccount,
  getPermissions,
  getSettings,
  updateSettings,
  handleSystemAction,
} = require("../../controllers/it_department/Account_control");
const router = express.Router();


const authmiddleware = require("../../middlewears/auth");

router.get("/permissions", authmiddleware, getPermissions);

// Security Settings
router.get("/settings", authmiddleware, getSettings);
router.patch("/settings",authmiddleware, updateSettings);

// System Actions
router.post("/actions", authmiddleware, handleSystemAction);

// Reset staff account password

module.exports = router;
