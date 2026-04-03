const bcrypt = require("bcrypt");
const Staff = require("../../models/staff.model");
const {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
} = require("../../validations/staffValidation/staff.validation");

// Add a new staff member
const addStaff = async (req, res) => {
  try {
    const { error, value } = addStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingStaff = await Staff.findOne({
      $or: [{ email: value.email }, { phone: value.phone }],
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
      password: hashedPassword,
    });

    await newStaff.save();

    res.status(201).json({
      message: "Staff added successfully",
      staff: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        department: newStaff.department,
        isActive: newStaff.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while adding staff" });
  }
};

// Edit an existing staff member
const editStaff = async (req, res) => {
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
        $or: [
          { email: value.email || "" },
          { phone: value.phone || "" },
        ],
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

// Deactivate or toggle active status of a staff member
const deactivateStaff = async (req, res) => {
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
const resetPassword = async (req, res) => {
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

module.exports = {
  addStaff,
  editStaff,
  deactivateStaff,
  resetPassword,
};
