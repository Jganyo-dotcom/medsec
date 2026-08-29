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
const { sendUniversalMail } = require("../../common/ManagerAND mailutils");
const ItAdminActionLogs = require("../../models/itAdmin/ItAdminActionLogs");
const logITAction = require("../../common/ITutiles");
const Settings = require("../../models/itAdmin/settings");

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

    await logITAction(
      req.user.staffId, // 1. userId (Who performed it)
      "CREATE_STAFF", // 2. action
      newHospitalIT._id, // 3. entityId (Target staff ID - fixed variable name)
      "HospitalIT", // 4. entityType (MUST be string "HospitalIT")
      "HospitalIT", // 5. path (MUST be string "HospitalIT")
      req.user.hospitalId, // 6. hospitalId
    );

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

    // 3. Account not found
    if (!record) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Account not found" });
    }

    const staff = record.staffAccounts;

    // 4. Log and reject deactivated or blocked accounts
    if (!staff.isActive || staff.blocked) {
      await session.abortTransaction();
      session.endSession();

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

    // 5. Fetch hospital security settings from Setting model
    const hospitalSetting = await Settings.findOne({
      hospital: record.hospital,
    }).session(session);

    // Extract dynamic lockout limit (e.g., "5 attempts" -> 5)
    const maxLockoutAttempts = hospitalSetting?.lockoutAttempts
      ? parseInt(hospitalSetting.lockoutAttempts, 10)
      : 5;

    // 6. Verify password & enforce dynamic lockout threshold
    const isPasswordMatch = await bcrypt.compare(password, staff.password);

    if (!isPasswordMatch) {
      record.staffAccounts.failedAttempts = (staff.failedAttempts || 0) + 1;

      // Lock account if failed attempts hit setting limit
      if (record.staffAccounts.failedAttempts >= maxLockoutAttempts) {
        record.staffAccounts.blocked = true;
      }

      await record.save({ session });
      await session.commitTransaction();
      session.endSession();

      await logITAction(
        record._id,
        "LOGIN",
        record._id,
        "HospitalIT",
        "HospitalIT",
        record.hospital,
        "Failed",
      );

      return res.status(401).json({
        message: record.staffAccounts.blocked
          ? `Account locked due to ${maxLockoutAttempts} consecutive failed attempts.`
          : "Invalid email or password",
      });
    }

    // Reset failed attempts on successful password match
    record.staffAccounts.failedAttempts = 0;
    await record.save({ session });
    console.log(staff.isVerified);

    // 7. Check initial account email verification
    if (!staff.isVerified) {
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 30);
      console.log(otpCode)

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
        requireVerification: true,
        message:
          "Account is not verified. A 6-digit code has been sent to your email.",
      });
    }

    // 8. Lookup hospital details
    const associatedHospital = await Hospitals.findById(
      record.hospital,
    ).session(session);

    const hospitalName = associatedHospital
      ? associatedHospital.hospitalDetails.name
      : "Unknown Hospital";

    // 9. Read 2FA rule from hospital Setting model (defaults to true if missing)
    const is2FAEnabled = hospitalSetting ? hospitalSetting.twoFA : true;

    if (is2FAEnabled) {
      const lastLoginEntry = await loginLogs
        .findOne({ staff: record._id })
        .sort({ createdAt: -1 })
        .session(session);

      const now = new Date();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      const last2FA = staff.last2FAAt ? new Date(staff.last2FAAt) : null;
      const lastLogin = lastLoginEntry ? new Date(lastLoginEntry.date) : null;

      const daysSince2FA = last2FA ? now - last2FA : Infinity;
      const daysInactive = lastLogin ? now - lastLogin : Infinity;

      // Require 2FA if never completed, >= 30 days since last 2FA, or >= 30 days inactive
      const require2FA =
        !last2FA ||
        daysSince2FA >= THIRTY_DAYS_MS ||
        daysInactive >= THIRTY_DAYS_MS;

      if (require2FA) {
        const twoFaCode = crypto.randomInt(100000, 999999).toString();
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        record.staffAccounts.twoFAToken = twoFaCode;
        record.staffAccounts.twoFATokenExpiry = expiryTime;
        await record.save({ session });

        // Dispatch code via universal mailer
        await sendUniversalMail("2FACTOR_AUTH", {
          recipientEmail: staff.email,
          recipientName: staff.name,
          subject: "Security Verification: Your 2FA Login Code",
          otpCode: twoFaCode,
        });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
          require2FA: true,
          email: staff.email,
          message:
            "2FA required. A verification code has been sent to your email.",
        });
      }
    }

    // 10. Issue JWT token (When 2FA is satisfied or disabled)
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

    // 11. Log successful login
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
      require2FA: false,
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
    console.error("System error during login:", globalError);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//////////////////////////////////////////////////////////////////////

/**
 * Verify 2FA Login Code
 * POST /accountStaff/verify-2fa
 */
const verify2FA = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res
        .status(400)
        .json({ message: "Email and OTP code are required." });
    }

    // 1. Fetch parent document containing the nested staff account
    const hospitalIT = await HospitalIT.findOne({
      "staffAccounts.email": email.toLowerCase().trim(),
    });

    if (!hospitalIT || !hospitalIT.staffAccounts) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    const account = hospitalIT.staffAccounts;

    // 2. Validate OTP code match
    if (!account.twoFAToken || account.twoFAToken !== otpCode.trim()) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    // 3. Check expiration
    if (
      account.twoFATokenExpiry &&
      new Date() > new Date(account.twoFATokenExpiry)
    ) {
      return res.status(400).json({
        message: "Verification code has expired. Please log in again.",
      });
    }

    // 4. Clear 2FA fields & update activity timestamps
    account.twoFAToken = null;
    account.twoFATokenExpiry = null;
    account.last2FAAt = new Date();
    account.lastLoginAt = new Date();

    await hospitalIT.save();

    // 5. Generate Auth Token
    const token = jwt.sign(
      {
        staffId: hospitalIT._id,
        role: account.role,
        hospitalId: hospitalIT.hospital,
        hospitalCode: hospitalIT.hospitalCode,
        email: account.email,
      },
      process.env.JWT_SECRETE || "your_fallback_secret",
      { expiresIn: "1d" },
    );

    // 6. Return response formatted for frontend
    return res.status(200).json({
      message: "2FA authentication successful.",
      token,
      staff: {
        id: hospitalIT._id,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
      },
    });
  } catch (error) {
    console.error("2FA Verification Error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during 2FA verification." });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
const verifyStaffAccount = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res
        .status(400)
        .json({ message: "Email and OTP code are required." });
    }

    const hospitalIT = await HospitalIT.findOne({
      "staffAccounts.email": email.toLowerCase().trim(),
    });

    if (!hospitalIT || !hospitalIT.staffAccounts) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    const account = hospitalIT.staffAccounts;

    // 2. Validate token match
    if (
      !account.verificationToken ||
      account.verificationToken !== otpCode.trim()
    ) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    // 3. Check expiration
    if (
      account.verificationTokenExpiry &&
      new Date() > new Date(account.verificationTokenExpiry)
    ) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // 4. Update verification status and clear tokens
    account.isVerified = true;
    account.verificationToken = null;
    account.verificationTokenExpiry = null;
    account.lastLoginAt = new Date();

    await hospitalIT.save();

    // 5. Issue Token
    const token = jwt.sign(
      {
        staffId: hospitalIT._id,
        role: account.role,
        hospitalId: hospitalIT.hospital,
        hospitalCode: hospitalIT.hospitalCode,
        email: account.email,
      },
      process.env.JWT_SECRETE || "your_fallback_secret",
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Account verified successfully.",
      token,
      staff: {
        id: hospitalIT._id,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
      },
    });
  } catch (error) {
    console.error("Account Verification Error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during account verification." });
  }
};

//////////////////////////////////////////////////////////////////////
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
      status: account.isActive ? "Active" : "Inactive",
      blocked: account.blocked,
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

    // Scope query to current hospital
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

    // 2. Keyword Search Filter
    if (search.trim()) {
      filter.$or = [
        { message: { $regex: search.trim(), $options: "i" } },
        { action: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // 3. Fetch logs with populated performer and receiver details
    const logs = await ItAdminActionLogs.find(filter)
      .populate({
        path: "userId",
        select:
          "staffAccounts.name staffAccounts.email staffAccounts.role staffAccounts.department staffAccounts.staffID",
      })
      .populate({
        path: "entityId", // Dynamically fetches Patient or HospitalIT based on entityType
      })
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
  verify2FA,
  verifyStaffAccount,
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
