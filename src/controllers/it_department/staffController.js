const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Brevo = require("@getbrevo/brevo");
const jwt = require("jsonwebtoken");
const HospitalIT = require("../../models/itAdmin/it.depart");
const Hospitals = require("../../models/hospital.schema");
const loginLogs = require("../../models/loginLogs");
const mongoose = require("mongoose");
const {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
} = require("../../validations/staffValidation/staff.validation");
const lastEdited = require("../../models/itAdmin/lastEdited");
const deleteBy = require("../../models/deletedBy");
const { sendUniversalMail } = require("../../common/Managerutils");
const ItAdminActionLogs = require("../../models/itAdmin/ItAdminActionLogs");
const logITAction = require("../../common/ITutiles");

// Register a new staff member

const registerStaff = async (req, res) => {
  try {
    // 1. Validate request body
    const { error, value } = addStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { firstName, lastName, email, department, role, password } = value;

    const phone = value.phone || value.contact;
    const staffID = value.staffID || value.staffId;
    const fullName = `${firstName} ${lastName}`.trim();

    // 2. Validate hospital credentials from token context
    if (!req.user || !req.user.hospitalId || !req.user.hospitalCode) {
      return res.status(400).json({
        error:
          "Missing required hospital details in user authentication token.",
      });
    }

    // 3. Check for duplicates across staffAccounts (email, phone, staffID)
    const existingStaff = await HospitalIT.findOne({
      $or: [
        { "staffAccounts.email": email },
        { "staffAccounts.phone": phone },
        { "staffAccounts.staffID": staffID },
      ],
    });

    if (existingStaff) {
      return res.status(400).json({
        error: "Staff with this Email, Phone, or Staff ID already exists.",
      });
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Construct new document following HospitalITSchema
    const newHospitalIT = new HospitalIT({
      hospital: req.user.hospitalId,
      createdBy: req.user.staffId,
      hospitalCode: req.user.hospitalCode,
      staffAccounts: {
        name: fullName,
        department: department,
        email: email,
        phone: phone,
        staffID: staffID,
        role: role,
        password: hashedPassword,
        isAdminDisabled: req.user.isdisabled || false,
      },
    });

    await newHospitalIT.save();

    const savedStaff = newHospitalIT.staffAccounts;

    // 6. Return response
    return res.status(201).json({
      message: "Staff added successfully",
      staff: {
        id: savedStaff._id,
        name: savedStaff.name,
        email: savedStaff.email,
        phone: savedStaff.phone,
        role: savedStaff.role,
        department: savedStaff.department,
        staffID: savedStaff.staffID,
        hospitalCode: newHospitalIT.hospitalCode,
        isActive: savedStaff.isActive,
      },
    });
  } catch (err) {
    console.error("Error in registerStaff:", err);
    return res.status(500).json({ error: "Server error while adding staff." });
  }
};

module.exports = { registerStaff };

// Edit staff
const editStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { hospitalId } = req.user;
    console.log("Editing staff document ID:", staffId);

    // 1. Validate incoming body payload
    const { error, value } = editStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // 2. Fetch the specific HospitalIT document by its ID
    const hospitalAdmin = await HospitalIT.findById(staffId);
    if (!hospitalAdmin) {
      return res.status(404).json({ error: "Staff member record not found" });
    }

    // Security check: ensure this record belongs to the logged-in user's hospital
    if (hospitalAdmin.hospital.toString() !== hospitalId.toString()) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this record" });
    }

    // 3. Extract and normalize fields to handle mismatch between Joi input and Mongoose Schema
    const finalEmail = value.email ? value.email.toLowerCase() : undefined;
    const finalPhone = value.phone || value.contact; // Map either frontend payload property to schema "phone"

    // Construct the standard unified name if individual components are sent
    let finalName = value.name;
    if (!finalName && (value.firstName || value.lastName)) {
      finalName = `${value.firstName || ""} ${value.lastName || ""}`.trim();
    }

    // 4. Duplicate Check across OTHER hospital staff documents
    if (finalEmail || finalPhone) {
      const duplicateQuery = {
        _id: { $ne: staffId }, // Exclude this current staff document
        $or: [],
      };

      if (finalEmail) {
        duplicateQuery.$or.push({ "staffAccounts.email": finalEmail });
      }
      if (finalPhone) {
        duplicateQuery.$or.push({ "staffAccounts.phone": finalPhone });
      }

      if (duplicateQuery.$or.length > 0) {
        const duplicateExists = await HospitalIT.findOne(duplicateQuery);
        if (duplicateExists) {
          const existingEmail =
            duplicateExists.staffAccounts?.email?.toLowerCase();
          const isEmailDuplicate = existingEmail === finalEmail;

          return res.status(400).json({
            error: isEmailDuplicate
              ? "Email already exists."
              : "Phone number already exists.",
          });
        }
      }
    }

    // 5. Construct the safe update object mapping Joi fields onto nested schema paths
    const updateFields = {};

    if (finalName) updateFields["staffAccounts.name"] = finalName;
    if (finalEmail) updateFields["staffAccounts.email"] = finalEmail;
    if (finalPhone) updateFields["staffAccounts.phone"] = finalPhone;
    if (value.department)
      updateFields["staffAccounts.department"] = value.department;
    if (value.role) updateFields["staffAccounts.role"] = value.role;

    // Safety check: only perform update if we actually mapped fields
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No modifiable fields provided." });
    }

    // Run the direct atomic update query on the model
    const updatedAdmin = await HospitalIT.findByIdAndUpdate(
      staffId,
      { $set: updateFields },
      { returnDocument: "after", runValidators: true }, // Correct modern option to fix deprecation warning
    );

    // 6. Save edit audit log
    const now = new Date();
    const whoEdited = new lastEdited({
      staff: req.user.staffId, // Maintained exactly as requested
      date: now,
      time: now.toLocaleTimeString("en-GB", { hour12: false }),
      editedWho: staffId,
      editedModel: "HospitalIT",
    });
    await whoEdited.save();

    await logITAction(
      req.user.staffId, // Who did the action
      "EDIT_STAFF", // Action key
      staffId, // Target entity ID being edited
      "HospitalIT", // Target entity type
      "HospitalIT", // Actor model type (path)
      hospitalId,
    );

    // 7. Return updated staff object from the nested field structure
    const staffData = updatedAdmin.staffAccounts;
    return res.status(200).json({
      message: "Staff updated successfully",
      staff: {
        id: updatedAdmin._id,
        name: staffData.name,
        email: staffData.email,
        role: staffData.role,
        department: staffData.department,
        phone: staffData.phone,
        staffID: staffData.staffID,
        isActive: staffData.isActive,
      },
    });
  } catch (err) {
    console.error("Error editing staff:", err);
    return res.status(500).json({ error: "Server error while editing staff" });
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
    const hospitalCode = req.user.hospitalCode;
    console.log(hospitalCode);

    // 1. Fetch all matching staff documentation records
    const hospitals = await HospitalIT.find({
      hospitalCode: hospitalCode,
    }).select("staffAccounts _id hospitalCode");

    if (!hospitals || hospitals.length === 0) {
      return res.status(404).json({ message: "No staff found" });
    }

    // 2. Map through accounts asynchronously to query the last login log entry for each
    const staff = await Promise.all(
      hospitals.map(async (h) => {
        // Query the logs collection for the single newest document matching this staff ID
        const lastLog = await loginLogs
          .findOne({ staff: h._id })
          .sort({ createdAt: -1 }) // Sort by newest first
          .select("date time"); // Only pull the fields we need

        return {
          id: h._id,
          name: h.staffAccounts.name,
          email: h.staffAccounts.email,
          role: h.staffAccounts.role,
          department: h.staffAccounts.department,
          isActive: h.staffAccounts.isActive,
          blocked: h.staffAccounts.blocked,
          hospitalCode: h.hospitalCode,
          status: h.staffAccounts.isActive,
          lastLoginDate: lastLog ? lastLog.date : "Never",
          lastLoginTime: lastLog ? lastLog.time : "",
        };
      }),
    );

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password } = req.body;

    // 1. Validate required inputs
    if (!email || !password) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // 2. Find staff record by email
    let record = await HospitalIT.findOne({
      "staffAccounts.email": email,
    }).session(session);

    // 3. Account not found (Cannot log to a hospital scope without an associated hospital ID)
    if (!record) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Account not found" });
    }

    const staff = record.staffAccounts;

    // 4. Log and reject deactivated or blocked accounts
    if (!staff.isActive || staff.blocked || staff.isAdminDisabled) {
      await session.abortTransaction();
      session.endSession();

      // Log blocked login attempt
      await logITAction(
        record._id,
        "LOGIN",
        record._id,
        "HospitalIT",
        "HospitalIT",
        record.hospital,
        "Failed",
      );

      return res.status(403).json({
        message: "Your account is deactivated or blocked. Contact IT support.",
      });
    }

    // 5. Verify password
    const isPasswordMatch = await bcrypt.compare(password, staff.password);
    if (!isPasswordMatch) {
      record.staffAccounts.failedAttempts = staff.failedAttempts + 1;

      if (record.staffAccounts.failedAttempts >= 5) {
        record.staffAccounts.blocked = true;
      }

      await record.save({ session });
      await session.commitTransaction(); // Commit failed attempt count to DB
      session.endSession();

      // 🚨 LOG INVALID CREDENTIAL ATTEMPT
      await logITAction(
        record._id,
        "LOGIN",
        record._id,
        "HospitalIT",
        "HospitalIT",
        record.hospital,
        "Failed",
      );

      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Fetch previous login timestamp
    const lastLoginEntry = await loginLogs
      .findOne({ staff: record._id })
      .sort({ createdAt: -1 })
      .session(session);

    // Reset failed attempts on success
    record.staffAccounts.failedAttempts = 0;
    await record.save({ session });

    // 6. Check email verification
    if (staff.isVerified === "any") {
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 30);

      record.staffAccounts.verificationToken = otpCode;
      record.staffAccounts.verificationTokenExpiry = expiryTime;
      await record.save({ session });

      await sendUniversalMail("STAFF_VERIFICATION", {
        recipientEmail: staff.email,
        recipientName: staff.name,
        subject: "Action Required: Verify Your Hospital Staff Account",
        otpCode: otpCode,
      });

      await session.commitTransaction();
      session.endSession();
      return res.status(403).json({
        message:
          "Account is not verified. A 6-digit code has been sent to your email.",
      });
    }

    // 7. Lookup hospital info
    const associatedHospital = await Hospitals.findById(
      record.hospital,
    ).session(session);
    const hospitalName = associatedHospital
      ? associatedHospital.hospitalDetails.name
      : "Unknown Hospital";

    // 8. Sign JWT token
    const token = jwt.sign(
      {
        staffId: record._id,
        email: staff.email,
        role: staff.role,
        hospitalId: record.hospital,
        hospitalCode: record.hospitalCode,
      },
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    const now = new Date();
    await loginLogs.create(
      [
        {
          staff: record._id,
          date: now,
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // 9. Successful Login Audit Log
    await logITAction(
      record._id,
      "LOGIN",
      record._id,
      "HospitalIT",
      "HospitalIT",
      record.hospital,
      "Successful",
    );

    return res.status(200).json({
      success: true,
      token,
      staff: {
        _id: record._id,
        hospital: hospitalName,
        name: staff.name,
        department: staff.department,
        email: staff.email,
        role: staff.role,
        hasChangedPassword: staff.hasChangedPassword,
      },
    });
  } catch (globalError) {
    await session.abortTransaction();
    session.endSession();
    console.error("System error:", globalError);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if parameter is a valid MongoDB ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    // Build search query: search by _id or staffID under current hospital
    const query = {
      hospitalCode: req.user.hospitalCode,
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { "staffAccounts.staffID": id },
      ],
    };

    // Find staff member and exclude sensitive fields like password
    const staffDoc = await HospitalIT.findOne(query).select(
      "-staffAccounts.password",
    );

    if (!staffDoc) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const lastLoggedIn = await loginLogs
      .findOne({ staff: id })
      .sort({ createdAt: -1 })
      .select("date time");

    const account = staffDoc.staffAccounts;

    // Format the response structure to match your frontend requirements
    const formattedStaff = {
      id: account.staffID || staffDoc._id,
      _id: staffDoc._id,
      name: account.name,
      email: account.email,
      contact: account.phone,
      role: account.role,
      department: account.department,
      status: account.isActive && !account.blocked ? "Active" : "Inactive",
      accessLevel: account.role,
      dateJoined: new Date(staffDoc.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      lastLogin: lastLoggedIn || "N/A", // Can be updated if you track login history
      recentActivity: [], // Placeholder for activity log feed
    };

    return res.status(200).json({ staff: formattedStaff });
  } catch (err) {
    console.error("Error fetching staff details:", err);
    return res
      .status(500)
      .json({ error: "Server error while fetching staff details" });
  }
};

module.exports = { getStaffById };

const verifyStaffOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    // 1. Basic validation input guard
    if (!email || !otpCode) {
      return res
        .status(400)
        .json({ message: "Email and verification code are required" });
    }

    // 2. Find the staff record by email
    const record = await HospitalIT.findOne({ "staffAccounts.email": email });
    console.log(record);

    // 3. If account doesn't exist
    if (!record) {
      return res.status(404).json({ message: "Account not found" });
    }

    const staff = record.staffAccounts;

    // 4. Check if the account is already verified
    if (staff.isVerified) {
      return res
        .status(400)
        .json({ message: "Account is already verified. Please log in." });
    }

    // 5. Verify the code matches
    if (staff.verificationToken !== otpCode) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    // 6. Check if the code has expired (30-minute limit check)
    const currentTime = new Date();
    if (currentTime > staff.verificationTokenExpiry) {
      return res.status(410).json({
        message:
          "Verification code has expired. Please log in again to generate a new code.",
      });
    }

    // 7. Success! Update verification fields directly on the object
    record.staffAccounts.isVerified = true;
    record.staffAccounts.verificationToken = null; // Clear token for security
    record.staffAccounts.verificationTokenExpiry = null; // Clear expiry window

    // Save the changes to the database
    await record.save();

    return res.status(200).json({
      message:
        "Account verification successful! You can now log in to your dashboard.",
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

const getActivityLogs = async (req, res) => {
  try {
    const { hospitalId } = req.user;
    const { range = "Today", search = "" } = req.query;

    if (!hospitalId) {
      return res.status(400).json({ error: "Hospital ID context is missing." });
    }

    // Base query scoped to the current user's hospital
    const filter = { hospital: hospitalId };

    // 1. Calculate Date Range Filters
    const now = new Date();
    if (range === "Today") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      filter.createdAt = { $gte: startOfDay };
    } else if (range === "This Week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: sevenDaysAgo };
    } else if (range === "This Month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.createdAt = { $gte: startOfMonth };
    }
    // "All Time" skips the createdAt filter constraint

    // 2. Keyword Search Filter
    if (search.trim()) {
      filter.$or = [
        { message: { $regex: search.trim(), $options: "i" } },
        { action: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // 3. Fetch logs sorted newest first
    const logs = await ItAdminActionLogs.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    return res.status(500).json({ error: "Failed to retrieve activity logs." });
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
  getStaffById,
  getActivityLogs,
};
