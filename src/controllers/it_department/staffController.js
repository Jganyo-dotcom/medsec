const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Brevo = require("@getbrevo/brevo");
const jwt = require("jsonwebtoken");
const HospitalIT = require("../../models/it.depart");
const Hospitals = require("../../models/hospital.schema");
const loginLogs = require("../../models/loginLogs");
const mongoose = require("mongoose");
const {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
} = require("../../validations/staffValidation/staff.validation");
const lastEdited = require("../../models/lastEdited");
const deleteBy = require("../../models/deletedBy");
const { sendUniversalMail } = require("../../utils");


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

    const now = new Date();
    const whoEdited = new lastEdited({
      staff: staff._id,
      date: now, // full date
      time: now.toLocaleTimeString("en-GB", { hour12: false }),
      // e.g. "14:35:22" (24-hour format, no date)
      editedWho: req.user.id,
      editedModel: "HospitalIT",
    });

    await whoEdited.save();

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

    const hospital = await Hospitals.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const staff = await HospitalIT.findById(staffId);
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // Toggle blocked status
    staff.staffAccounts.blocked = !staff.staffAccounts.blocked;
    await staff.save();

    res.status(200).json({
      message: `Staff ${staff.staffAccounts.blocked ? "deactivated" : "activated"} successfully`,
      blocked: staff.staffAccounts.blocked,
    });
  } catch (err) {
    console.error("Error disabling staff:", err);
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

    const hospital = await Hospitals.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const staff = await HospitalIT.findOne({
      _id: staffId,
      hospital: hospitalId,
    });
    if (!staff || staff.length === 0) {
      return res.status(404).json({ error: "Staff not found" });
    }
    const salt = await bcrypt.genSalt(10);
    staff.staffAccounts.password = await bcrypt.hash(value.newPassword, salt);
    staff.staffAccounts.failedAttempts = 0; // reset attempts after password reset
    staff.staffAccounts.hasChangedPassword = false;
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

const deleteStaffById = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    // Convert hospitalId string to ObjectId
    const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);
    const Staff = await HospitalIT.findById(hospitalObjectId);

    if (Staff) {
      const now = new Date();

      const whoDeleted = new deleteBy({
        staff: req.user.staff,
        date: now, // full date
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        // e.g. "14:35:22" (24-hour format, no date)
        editedWho: Staff.staffAccounts.name,
        role: Staff.staffAccounts.role,
      });

      await whoDeleted.save();

      await Staff.deleteOne();
    }
    if (!Staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    return res.status(200).json({
      message: "Staff deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting Staff:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Login staff with failedAttempts handling

const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Check if user typed email and password
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Find the staff record by email
    let record = await HospitalIT.findOne({ "staffAccounts.email": email });

    // 3. 🚀 CLEANED UP: Return 404 immediately if not found
    // The hospital rep profile creation now happens directly during hospital login
    if (!record) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Extract the staff details into a simple variable to read easily
    const staff = record.staffAccounts;

    // 4. Check if account is blocked or disabled
    if (!staff.isActive || staff.blocked || staff.isAdminDisabled) {
      record.staffAccounts.blocked = false;
      await record.save(); // 🚀 This is the correct way to save changes to the database
      await staff.save()
      return res.status(403).json({ 
        message: "Your account is deactivated or blocked. Contact IT support." 
      });
    }

    // 5. Check if password matches
    const isPasswordMatch = await bcrypt.compare(password, staff.password);
    if (!isPasswordMatch) {
      // Increase wrong attempts by 1
      record.staffAccounts.failedAttempts = staff.failedAttempts + 1;

      // If they miss password 5 times, block them
      if (record.staffAccounts.failedAttempts >= 5) {
        record.staffAccounts.blocked = true;
      }

      await record.save();
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Reset wrong attempts back to 0 on successful password entry
    record.staffAccounts.failedAttempts = 0;
    await record.save();

    // 6. Check if email is verified
    if (!staff.isVerified) {
      // Create a 6-digit number string
      const otpCode = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration time to 30 minutes from now
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 30);

      // Save OTP and Expiry directly to the staff object
      record.staffAccounts.verificationToken = otpCode;
      record.staffAccounts.verificationTokenExpiry = expiryTime;
      await record.save();

      // Send the email using your universal mail function
      await sendUniversalMail("STAFF_VERIFICATION", {
        recipientEmail: staff.email,
        recipientName: staff.name,
        subject: "Action Required: Verify Your Hospital Staff Account",
        otpCode: otpCode
      });

      return res.status(403).json({ 
        message: "Account is not verified. A 6-digit code has been sent to your email." 
      });
    }

    // 7. Look up the connected Hospital's name using the linked ID
    const associatedHospital = await Hospitals.findById(record.hospital);
    const hospitalName = associatedHospital ? associatedHospital.name : "Unknown Hospital";

    // 8. Create the JWT login session token
    const token = jwt.sign(
      { 
        staffId: record._id, 
        email: staff.email, 
        role: staff.role,
        hospitalId: record.hospital,
        hospitalCode: record.hospitalCode
      },
      process.env.JWT_SECRETE, 
      { expiresIn: process.env.EXPIRES_IN } 
    );

    // 9. Prepare what to send back to the user interface screen
    const clientPayload = {
      _id: record._id,
      hospital: hospitalName,
      name: staff.name,
      department: staff.department,
      email: staff.email,
      role: staff.role,
      hasChangedPassword: staff.hasChangedPassword
    };

    return res.status(200).json({ 
      message: "Login successful", 
      token: token,
      staff: clientPayload 
    });

  } catch (globalError) {
    console.error("System error:", globalError);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const verifyStaffOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    // 1. Basic validation input guard
    if (!email || !otpCode) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    // 2. Find the staff record by email
    const record = await HospitalIT.findOne({ "staffAccounts.email": email });
    console.log(record)

    // 3. If account doesn't exist
    if (!record) {
      return res.status(404).json({ message: "Account not found" });
    }

    const staff = record.staffAccounts;

    // 4. Check if the account is already verified
    if (staff.isVerified) {
      return res.status(400).json({ message: "Account is already verified. Please log in." });
    }

    // 5. Verify the code matches
    if (staff.verificationToken !== otpCode) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    // 6. Check if the code has expired (30-minute limit check)
    const currentTime = new Date();
    if (currentTime > staff.verificationTokenExpiry) {
      return res.status(410).json({ 
        message: "Verification code has expired. Please log in again to generate a new code." 
      });
    }

    // 7. Success! Update verification fields directly on the object
    record.staffAccounts.isVerified = true;
    record.staffAccounts.verificationToken = null; // Clear token for security
    record.staffAccounts.verificationTokenExpiry = null; // Clear expiry window

    // Save the changes to the database
    await record.save();

    return res.status(200).json({ 
      message: "Account verification successful! You can now log in to your dashboard." 
    });

  } catch (globalError) {
    console.error("Verification processing error:", globalError);
    return res.status(500).json({ message: "Internal server error" });
  }
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
  verifyStaffOTP,
  getInactiveStaff,
  getActiveStaff,
  sendStaffDetails,
  revokeStaffAccess,
  disableStaff,
  registerStaff,
  editStaffById,
};
