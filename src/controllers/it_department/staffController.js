const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const HospitalIT = require("../../models/it.depart");
const Hospitals = require("../../models/hospital.schema");
const {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
} = require("../../validations/staffValidation/staff.validation");

// Register a new staff member
const registerStaff = async (req, res) => {
  try {
    const { error, value } = addStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const hospital = await HospitalIT.findOne({
      hospitalCode: req.user.hospitalCode,
    });
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    // Check for duplicate email/phone
    const existingStaff = await HospitalIT.findOne({
      $or: [
        { "staffAccounts.email": value.email },
        { "staffAccounts.phone": value.phone },
      ],
    });

    if (existingStaff) {
      return res
        .status(400)
        .json({ error: "Staff with this email or phone already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.password, salt);

    const newhospital = new HospitalIT({
      hospital: req.user.hospital, // or however you reference the hospital
      hospitalCode: req.user.hospitalCode,
      staffAccounts: {
        ...value,
        password: hashedPassword,
        isActive: true,
        failedAttempts: 0,
        isAdminDisabled: req.user.isdisabled,
        createdBy: req.user.id,
      },
    });
    await newhospital.save();

    const staff = newhospital.staffAccounts;

    res.status(201).json({
      message: "Staff added successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        hospitalCode: hospital.hospitalCode,
        department: staff.department,
        isActive: staff.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while adding staff" });
  }
};

// Edit staff
const editStaffById = async (req, res) => {
  try {
    const { hospitalId, staffId } = req.params;
    const { error, value } = editStaffSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const hospital = await HospitalIT.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const staff = hospital.staffAccounts.id(staffId);
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // Check duplicates
    if (value.email || value.phone) {
      const existingStaff = hospital.staffAccounts.find(
        (s) =>
          (s.email === value.email || s.phone === value.phone) &&
          s._id.toString() !== staffId,
      );
      if (existingStaff) {
        return res.status(400).json({
          error: "Another staff member already uses this email or phone.",
        });
      }
    }

    Object.assign(staff, value);
    await hospital.save();

    res.status(200).json({
      message: "Staff updated successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        phone: staff.phone,
        isActive: staff.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while editing staff" });
  }
};

// Disable/toggle staff
const disableStaff = async (req, res) => {
  try {
    const { hospitalId, staffId } = req.params;
    const hospital = await HospitalIT.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const staff = hospital.staffAccounts.id(staffId);
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    staff.isActive = !staff.isActive;
    await hospital.save();

    res.status(200).json({
      message: `Staff ${staff.isActive ? "activated" : "deactivated"} successfully`,
      isActive: staff.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating staff status" });
  }
};

// Reset a staff member's password
const resetStaffPassword = async (req, res) => {
  try {
    const { hospitalId, staffId } = req.params;
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const hospital = await HospitalIT.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const staff = hospital.staffAccounts.id(staffId);
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    const salt = await bcrypt.genSalt(10);
    staff.password = await bcrypt.hash(value.newPassword, salt);
    staff.failedAttempts = 0; // reset attempts after password reset
    await hospital.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resetting password" });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const hospitals = await HospitalIT.find().select(
      "staffAccounts _id hospitalCode",
    );
    const staff = hospitals.map((h) => ({
      id: h._id, // hospital’s id
      name: h.staffAccounts.name,
      email: h.staffAccounts.email,
      role: h.staffAccounts.role,
      department: h.staffAccounts.department,
      isActive: h.staffAccounts.isActive,
      blocked: h.staffAccounts.blocked,
      hospitalCode: h.hospitalCode,
    }));

    if (!staff || staff.length === 0) {
      return res.status(404).json({ message: "No staff found" });
    }

    return res.status(200).json({
      message: "Staff fetched successfully",
      staff,
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete staff by ID
const mongoose = require("mongoose");
const loginLogs = require("../../models/loginLogs");

const deleteStaffById = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    // Convert hospitalId string to ObjectId
    const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

    const hospital = await HospitalIT.findByIdAndDelete(hospitalObjectId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    return res.status(200).json({
      message: "Hospital deleted successfully",
      hospital,
    });
  } catch (err) {
    console.error("Error deleting hospital:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Login staff with failedAttempts handling
const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // First, search HospitalIT for staff
    let hospital = await HospitalIT.findOne({ "staffAccounts.email": email });

    // If not found, search Hospitals collection
    if (!hospital) {
      const hospitalDoc = await Hospitals.findOne({
        "hospitalRep.email": email,
      });
      if (hospitalDoc) {
        // Add staff details into HospitalIT schema
        if (hospitalDoc) {
          try {
            hospital = new HospitalIT({
              hospital: hospitalDoc._id,
              hospitalCode: hospitalDoc.hospitalDetails.code,
              staffAccounts: {
                name: hospitalDoc.hospitalRep.name,
                department: "IT",
                email: hospitalDoc.hospitalRep.email,
                phone: hospitalDoc.hospitalRep.phone,
                role: "Admin",
                password: hospitalDoc.hospitalRep.password, // make sure this exists
                isActive: true,
              },
            });

            await hospital.save();

            return res
              .status(201)
              .json({ message: "We are all set up, try again" });
          } catch (err) {
            // Log the full error so you can see what went wrong
            console.error("Error saving HospitalIT:", err);

            // Handle duplicate key errors (email/phone already exists)
            if (err.code === 11000) {
              return res.status(400).json({
                message: "Duplicate staff email or phone in HospitalIT",
                details: err.keyValue,
              });
            }

            // Handle validation errors
            if (err.name === "ValidationError") {
              return res.status(400).json({
                message: "Validation failed",
                details: err.errors,
              });
            }

            // Fallback for other errors
            console.log(err);
            return res.status(500).json({ message: "Internal server error" });
          }
        }
      }
    }

    if (!hospital) return res.status(404).json({ message: "Staff not found" });

    const staff =
      hospital.staffAccounts.email === email ? hospital.staffAccounts : null;
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (!staff.isActive) {
      return res.status(403).json({ message: "Staff account is disabled" });
    }

    // Block if too many failed attempts
    if (staff.failedAttempts >= 5) {
      staff.blocked = true;
      await hospital.save();
      return res
        .status(403)
        .json({ message: "Account blocked due to too many failed attempts" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      staff.failedAttempts += 1;
      await hospital.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset failed attempts on success
    staff.failedAttempts = 0;
    await hospital.save();

    const token = jwt.sign(
      {
        staffId: staff._id,
        hospital: hospital._id,
        role: staff.role,
        hospitalCode: hospital.hospitalCode,
        isAdminDisabled: hospital.isAdminDisabled,
      },
      process.env.JWT_SECRETE || "fallback_secret",
      { expiresIn: process.env.EXPIRES_IN || "1d" },
    );

    const now = new Date();

    const whoLoggedIn = new LoginLog({
      staff: staff._id,
      date: now, // full date
      time: now.toLocaleTimeString("en-GB", { hour12: false }),
      // e.g. "14:35:22" (24-hour format, no date)
    });

    await whoLoggedIn.save();

    return res.status(200).json({
      message: "Login successful",
      token,
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (err) {
    console.error("Error logging in staff:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify Staff Login
const verifyStaffLogin = async (req, res) => {
  res.status(200).json({ message: "Staff login verified successfully" });
};

// Get inactive staff
const getInactiveStaff = async (req, res) => {
  try {
    const hospitals = await HospitalIT.find().select("staffAccounts");
    const inactiveStaff = hospitals.flatMap((h) =>
      h.staffAccounts.filter((s) => !s.isActive),
    );
    res.status(200).json({
      message: "Inactive staff retrieved successfully",
      data: inactiveStaff,
    });
  } catch (err) {
    console.error("Error fetching inactive staff:", err);
    res.status(500).json({ message: "Server error fetching inactive staff" });
  }
};

// Get active staff
const getActiveStaff = async (req, res) => {
  try {
    const hospitals = await HospitalIT.find().select("staffAccounts");
    const activeStaff = hospitals.flatMap((h) =>
      h.staffAccounts.filter((s) => s.isActive),
    );
    res.status(200).json({
      message: "Active staff retrieved successfully",
      data: activeStaff,
    });
  } catch (err) {
    console.error("Error fetching active staff:", err);
    res.status(500).json({ message: "Server error fetching active staff" });
  }
};

// Send details (stub)
const sendStaffDetails = async (req, res) => {
  res.status(200).json({ message: "Staff details sent (stub)" });
};

// Revoke access
const revokeStaffAccess = async (req, res) => {
  try {
    const { hospitalId, staffId } = req.params;
    const hospital = await HospitalIT.findById(hospitalId);
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });

    const staff = hospital.staffAccounts.id(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    staff.isActive = false;
    await hospital.save();

    res
      .status(200)
      .json({ message: "Staff access revoked successfully", staff });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
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
};
