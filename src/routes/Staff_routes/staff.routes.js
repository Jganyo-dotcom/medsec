const express = require("express");
const {
  addStaff,
  editStaff,
  deactivateStaff,
  resetPassword,
} = require("../../controllers/staff controller/staffController");

const router = express.Router();

router.post("/add", addStaff);
router.put("/edit/:id", editStaff);
router.patch("/deactivate/:id", deactivateStaff);
router.patch("/reset-password/:id", resetPassword);

module.exports = router;
