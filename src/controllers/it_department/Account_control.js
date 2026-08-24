const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Staff = require("../../models/itAdmin/it.depart"); // adjust path

// Block account
// Toggle block/unblock account status
const toggleBlockAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch staff member and populate hospital details
    const hospitalStaff = await Staff.findById(id).populate("hospital");

    // Validate existence and matching hospital code
    if (
      !hospitalStaff ||
      hospitalStaff.code !== hospitalStaff.hospital?.hosptalDetail?.code
    ) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Toggle the current blocked state (defaults to false if undefined)
    const isCurrentlyBlocked = Boolean(hospitalStaff.staffAccounts?.blocked);
    hospitalStaff.staffAccounts.blocked = !isCurrentlyBlocked;

    await hospitalStaff.save();

    const isNowBlocked = hospitalStaff.staffAccounts.blocked;
    const message = isNowBlocked
      ? "Staff account blocked successfully"
      : "Staff account unblocked successfully";

    // Return status message and updated state for frontend sync
    return res.status(200).json({
      message,
      blocked: isNowBlocked,
    });
  } catch (err) {
    console.error("Error toggling block account:", err);
    return res
      .status(500)
      .json({ error: "Server error while toggling account block status" });
  }
};

const resetPasswordforAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Find staff by ID and populate hospital reference
    const hospitalStaff = await Staff.findById(id).populate("hospital");
    if (
      !hospitalStaff ||
      hospitalStaff.hospitalCode !== hospitalStaff.hospital.hospitalDetails.code
    ) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Hash new temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Reset password and mark hasChangedPassword = false
    hospitalStaff.staffAccounts.password = hashedPassword;
    hospitalStaff.staffAccounts.hasChangedPassword = false;

    await hospitalStaff.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while resetting password" });
  }
};

module.exports = { toggleBlockAccount, resetPasswordforAccount };
