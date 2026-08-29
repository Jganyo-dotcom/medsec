const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Staff = require("../../models/itAdmin/it.depart"); // adjust path
const HospitalIT = require("../../models/itAdmin/it.depart");
const Setting = require("../../models/itAdmin/settings");
const mongoose = require("mongoose");
const logITAction = require("../../common/ITutiles");

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

    // Toggle the current blocked state
    const isCurrentlyBlocked = Boolean(hospitalStaff.staffAccounts?.blocked);
    hospitalStaff.staffAccounts.blocked = !isCurrentlyBlocked;

    // Persist changes to database first
    await hospitalStaff.save();

    const isNowBlocked = hospitalStaff.staffAccounts.blocked;
    const actionType = isNowBlocked ? "BLOCK_STAFF" : "UNBLOCK_STAFF";
    const adminUserId = req.user?.staffId;

    // Write audit log ONLY AFTER successful save
    await logITAction(
      adminUserId,
      actionType,
      hospitalStaff._id,
      "HospitalIT",
      "HospitalIT",
      hospitalStaff.hospital?._id || hospitalStaff.hospital,
      "Successful",
    );

    const message = isNowBlocked
      ? "Staff account blocked successfully"
      : "Staff account unblocked successfully";

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

    // Extract acting admin ID from authenticated request session/JWT token
    const adminUserId = req.user.staffId;
    // Find staff by ID and populate hospital reference
    const hospitalStaff = await Staff.findById(id).populate("hospital");
    if (
      !hospitalStaff ||
      hospitalStaff.hospitalCode !==
        hospitalStaff.hospital?.hospitalDetails?.code
    ) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Hash new temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Reset password and reset password state flags
    hospitalStaff.staffAccounts.password = hashedPassword;
    hospitalStaff.staffAccounts.hasChangedPassword = false;
    hospitalStaff.staffAccounts.resetPassword = true;
    hospitalStaff.staffAccounts.failedAttempts = 0;

    // Persist changes to database first
    await hospitalStaff.save();

    // Write audit log ONLY AFTER successful save
    await logITAction(
      adminUserId,
      "RESET_PASSWORD",
      hospitalStaff._id,
      "HospitalIT",
      "HospitalIT",
      hospitalStaff.hospital?._id || hospitalStaff.hospital,
      "Successful",
    );

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res
      .status(500)
      .json({ error: "Server error while resetting password" });
  }
};

// controllers/controlController.js

const ROLE_ACCESS_LEVELS = {
  Doctor: "Full Access",
  Nurse: "Limited Access",
  Pharmacist: "Restricted Access",
  LabScientist: "Limited Access",
  "IT Admin": "Limited Access",
  Receptionist: "Restricted Access",
};

// GET /api/control/permissions
const getPermissions = async (req, res) => {
  try {
    const { hospitalId } = req.user;

    // Convert hospitalId string to ObjectId if present
    const matchStage = hospitalId
      ? { $match: { hospital: new mongoose.Types.ObjectId(hospitalId) } }
      : { $match: {} };

    const roleCounts = await HospitalIT.aggregate([
      matchStage,

      // Deconstruct staffAccounts array if it's an embedded array
      { $unwind: "$staffAccounts" },

      {
        $group: {
          _id: "$staffAccounts.role",
          users: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          role: "$_id",
          users: 1,
        },
      },
    ]);

    const permissions = roleCounts.map((item) => ({
      role: item.role,
      users: item.users,
      level: ROLE_ACCESS_LEVELS[item.role] || "Limited Access",
    }));

    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to aggregate roles",
      error: error.message,
    });
  }
};

// GET /api/control/settings
const getSettings = async (req, res) => {
  try {
    const { hospitalId } = req.user;
    if (!hospitalId) {
      return res.status(400).json({ message: "Hospital ID is required" });
    }

    let settings = await Setting.findOne({ hospital: hospitalId });

    if (!settings) {
      settings = await Setting.create({ hospital: hospitalId });
    }

    res.status(200).json(settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch settings", error: error.message });
  }
};

// PATCH /api/control/settings
const updateSettings = async (req, res) => {
  try {
    const { hospitalId } = req.user;
    console.log(hospitalId);
    if (!hospitalId) {
      return res.status(400).json({ message: "Hospital ID is required" });
    }

    const updatedSettings = await Setting.findOneAndUpdate(
      { hospital: hospitalId },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json(updatedSettings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update settings", error: error.message });
  }
};

const handleSystemAction = async (req, res) => {
  const { action, staffId, password } = req.body;
  const adminUserId = req.user.staffId;

  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    let updateFields = {};

    switch (action) {
      case "SUSPEND_ACCOUNT":
      case "BLOCK_ACCOUNT":
        updateFields = {
          "staffAccounts.isAdminDisabled": true,
          "staffAccounts.isActive": false,
          "staffAccounts.blocked": true,
        };
        break;

      case "REACTIVATE_ACCOUNT":
      case "UNBLOCK_ACCOUNT":
        updateFields = {
          "staffAccounts.isAdminDisabled": false,
          "staffAccounts.isActive": true,
          "staffAccounts.blocked": false,
        };
        break;

      case "LOCK_ACCOUNT":
        updateFields = {
          "staffAccounts.blocked": true,
        };
        break;

      case "UNLOCK_ACCOUNT":
        updateFields = {
          "staffAccounts.blocked": false,
        };
        break;

      case "RESET_PASSWORD": {
        if (!password || password.trim().length < 6) {
          return res.status(400).json({
            message: "A valid temporary password (min 6 chars) is required.",
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password.trim(), salt);

        updateFields = {
          "staffAccounts.password": hashedPassword,
          "staffAccounts.hasChangedPassword": false,
          "staffAccounts.resetPassword": true,
          "staffAccounts.failedAttempts": 0,
        };
        break;
      }

      default:
        return res.status(400).json({ message: "Invalid action type" });
    }

    // Execute update against staffID
    const updatedAccount = await HospitalIT.findOneAndUpdate(
      { "staffAccounts.staffID": staffId.trim() },
      { $set: updateFields },
      { new: true },
    );

    if (!updatedAccount) {
      return res
        .status(404)
        .json({ message: `No staff record found with Staff ID: ${staffId}` });
    }

    // Write audit log strictly AFTER successful DB update
    await logITAction(
      adminUserId,
      action,
      updatedAccount._id,
      "HospitalIT",
      "HospitalIT",
      updatedAccount.hospital,
      "Successful",
    );

    // Return the updated document so the frontend state updates immediately
    return res.status(200).json({
      message: `Action executed successfully for Staff ID: ${staffId}`,
      staff: updatedAccount,
    });
  } catch (error) {
    console.error("System action error:", error);
    return res
      .status(500)
      .json({ message: "Action execution failed", error: error.message });
  }
};
module.exports = {
  toggleBlockAccount,
  resetPasswordforAccount,
  getPermissions,
  getSettings,
  updateSettings,
  handleSystemAction,
};
