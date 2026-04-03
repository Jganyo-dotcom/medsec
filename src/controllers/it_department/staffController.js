const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Staff = require("../../models/it.depart");
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

    const existingStaff = await Staff.findOne({
      $or: [
        { "staffAccounts.email": value.email },
        { "staffAccounts.phone": value.phone },
      ],
    });

    if (existingStaff) {
      return res.status(400).json({
        error: "Staff with this email or phone already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.password, salt);

    const newStaff = new Staff({
      ...value,
      "staffAccounts.password": hashedPassword,
    });

    await newStaff.save();

    //this is what i am talking about . since the one creating the staff account has a hospital code attached to their details make sure to add their hosptal codes
    res.status(201).json({
      message: "Staff added successfully",
      staff: {
        id: newStaff._id,
        name: newStaff.staffAccounts.name,
        email: newStaff.staffAccounts.email,
        role: value.role,
        HospitalCode: req.user.hospitalCode, // this is it also go through your code and make sure that it matches the new schema
        department: newStaff.staffAccounts.department,
        isActive: newStaff.staffAccounts.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while adding staff" });
  }
};

// Edit an existing staff member
const editStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = editStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // Check if new email/phone already exists in another staff record
    if (value.email || value.phone) {
      const existingStaff = await Staff.findOne({
        $or: [{ email: value.email || "" }, { phone: value.phone || "" }],
        _id: { $ne: id },
      });

      if (existingStaff) {
        return res.status(400).json({
          error: "Another staff member already uses this email or phone.",
        });
      }
    }

    Object.assign(staff, value);
    await staff.save();

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

// Disable or toggle active status of a staff member
const disableStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    staff.isActive = !staff.isActive; // toggle or set to false
    await staff.save();

    res.status(200).json({
      message: `Staff ${staff.isActive ? "activated" : "deactivated"} successfully`,
      isActive: staff.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while deactivating staff" });
  }
};

// Reset a staff member's password
const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: "Staff not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.newPassword, salt);

    staff.password = hashedPassword;
    await staff.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while resetting password" });
  }
};

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find();
    if (!staff || staff.length === 0) {
      return res.status(404).json({ message: "No staff found" });
    }
    return res
      .status(200)
      .json({ message: "Staff fetched successfully", staff });
  } catch (err) {
    console.error("Error fetching staff:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete staff by ID
const deleteStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res
      .status(200)
      .json({ message: "Staff deleted successfully", staff });
  } catch (err) {
    console.error("Error deleting staff:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Login staff
const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (!staff.isActive) {
      return res.status(403).json({ message: "Staff account is disabled" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Usually you'd use process.env.JWT_SECRETE but we safeguard with a fallback
    const token = jwt.sign(
      { staffId: staff._id, role: staff.role },
      process.env.JWT_SECRETE || "fallback_secret",
      { expiresIn: process.env.EXPIRES_IN || "1d" },
    );

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

// Verify Staff Login (stub to match m.js)
const verifyStaffLogin = async (req, res) => {
  res.status(200).json({ message: "Staff login verified successfully" });
};

// Get inactive staff
const getInactiveStaff = async (req, res) => {
  try {
    const inactiveStaff = await Staff.find({ isActive: false });
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
    const activeStaff = await Staff.find({ isActive: true });
    res.status(200).json({
      message: "Active staff retrieved successfully",
      data: activeStaff,
    });
  } catch (err) {
    console.error("Error fetching active staff:", err);
    res.status(500).json({ message: "Server error fetching active staff" });
  }
};

// Send details
const sendStaffDetails = async (req, res) => {
  res.status(200).json({ message: "Staff details sent (stub)" });
};

// Revoke access
const revokeStaffAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    res
      .status(200)
      .json({ message: "Staff access revoked successfully", staff });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
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
  revokeStaffAccess,
};
