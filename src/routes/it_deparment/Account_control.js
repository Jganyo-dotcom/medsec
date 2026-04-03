const express = require("express");
const {
  resetPasswordforAccount,
  blockAccount,
  unblockAccount,
} = require("../../controllers/it_department/Account_control");

const router = express.Router();

// Reset staff account password
router.patch("/staff/:id/reset-password", resetPasswordforAccount);

// Block staff account
router.patch("/staff/:id/block", blockAccount);

// Unblock staff account
router.patch("/staff/:id/unblock", unblockAccount);

module.exports = router;

