const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Staff = require("../../models/it.depart"); // adjust path

// Block account
const blockAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const hospitalStaff = await Staff.findById(id).populate("hospital");
    if (
      !hospitalStaff ||
      hospitalStaff.code !== hospitalStaff.hospital.hosptalDetail.code
    ) {
      return res.status(404).json({ error: "Staff not found" });
    }

    hospitalStaff.staffAccounts.blocked = true; // mark inactive
    await hospitalStaff.save();

    return res
      .status(200)
      .json({ message: "Staff account blocked successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while blocking account" });
  }
};

// Unblock account
const unblockAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const hospitalStaff = await Staff.findById(id).populate("hospital");
    if (
      !hospitalStaff ||
      hospitalStaff.code !== hospitalStaff.hospital.hosptalDetail.code
    ) {
      return res.status(404).json({ error: "Staff not found" });
    }

    hospitalStaff.staffAccounts.blocked = false; //
    await hospitalStaff.save();

    return res
      .status(200)
      .json({ message: "Staff account unblocked successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error while unblocking account" });
  }
};

const resetPasswordforAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { temppasswordfromadmin } = req.body;

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
    const hashedPassword = await bcrypt.hash(temppasswordfromadmin, salt);

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




module.exports = { blockAccount, unblockAccount, resetPasswordforAccount };
