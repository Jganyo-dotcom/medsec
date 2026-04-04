const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

// We now require it.depart.js instead of staff.model.js
const HospitalIT = require("../../models/it.depart");

const {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
} = require("../../validations/staffValidation/staff.validation");

// Helper: Generate staff code
async function generateStaffCode(name, role) {
  const words = name.trim().split(/\s+/);
  const acronym = words.map((w) => w[0].toUpperCase()).join("");
  const rolePart = role.slice(0, 3).toUpperCase();
  const timestampPart = Date.now().toString().slice(-4);
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `${acronym}-${rolePart}-${timestampPart}-${letters}`;
}

const registerStaff = async (req, res) => {
  try {
    const { error, value } = addStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Require hospitalCode to know where to insert this staff in the array
    const { hospitalCode } = req.body;
    if(!hospitalCode) {
        return res.status(400).json({ message: "hospitalCode payload is required to register a nested staff." });
    }

    const hospitalIT = await HospitalIT.findOne({ hospitalCode });
    if(!hospitalIT) return res.status(404).json({ message: "Hospital IT department not found for this code." });

    // manual confirm_password
    if (value.password !== value.confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check uniqueness across ALL hospitals (or just this one)
    const existingStaff = await HospitalIT.findOne({
      $or: [
        { "staffAccounts.email": value.email },
        { "staffAccounts.phone": value.phone }
      ]
    });
    if (existingStaff) return res.status(400).json({ message: "Staff with this email or phone already exists system-wide." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.password, salt);

    let s_code;
    let exists = true;
    while (exists) {
      s_code = await generateStaffCode(value.name, value.role);
      exists = await HospitalIT.findOne({ "staffAccounts.staffCode": s_code });
    }

    const newStaffData = {
      name: value.name,
      department: value.department,
      email: value.email,
      phone: value.phone,
      role: value.role,
      password: hashedPassword,
      staffCode: s_code,
      isVerified: false, 
      isdisabled: false,
      isactive: true,
      revokedAccess: false,
      lastquerry: Date.now(),
      hasChangedPassword: false
    };

    // Push into the embedded array
    hospitalIT.staffAccounts.push(newStaffData);
    await hospitalIT.save();

    // The new staff is the last element
    const createdStaff = hospitalIT.staffAccounts[hospitalIT.staffAccounts.length - 1];

    res.status(201).json({
      message: "Staff registered inside HospitalIT successfully",
      staff: {
        id: createdStaff._id,
        name: createdStaff.name,
        email: createdStaff.email,
        staffCode: createdStaff.staffCode,
        role: createdStaff.role,
      },
    });
  } catch (err) {
    console.error("Error registering staff:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginStaff = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Identifier and password required" });

    // Find the HospitalIT doc that has a staff matching identifier
    const hospitalIT = await HospitalIT.findOne({
      $or: [
        { "staffAccounts.staffCode": identifier },
        { "staffAccounts.email": identifier }
      ]
    });

    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });

    // Extract the exact staff subdoc
    const staff = hospitalIT.staffAccounts.find(s => s.staffCode === identifier || s.email === identifier);

    if (staff.isdisabled || staff.revokedAccess) {
      return res.status(403).json({ message: "Access revoked or staff disabled" });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    staff.lastquerry = Date.now();
    await hospitalIT.save();

    if (staff.isVerified) {
      const token = jwt.sign(
        { staffId: staff._id, role: staff.role, hospitalItId: hospitalIT._id },
        process.env.JWT_SECRETE || 'fallback_secret',
        { expiresIn: process.env.EXPIRES_IN || '1d' }
      );
      return res.status(200).json({
        message: "Login successful", token,
        staff: { id: staff._id, name: staff.name, staffCode: staff.staffCode, email: staff.email, role: staff.role }
      });
    }

    const tempCode = crypto.randomInt(100000, 999999).toString();
    staff.tempLoginCode = tempCode;
    staff.tempLoginExpires = Date.now() + 5 * 60 * 1000;
    await hospitalIT.save();

    if(process.env.SENDGRID_API) {
      sgMail.setApiKey(process.env.SENDGRID_API);
      const message = {
        from: process.env.EMAIL_USER || process.env.MAIL_USER || 'no-reply@medsec.com',
        to: staff.email,
        subject: "Your Staff Login Code",
        text: `Hello ${staff.name},\n\nYour temporary login code is: ${tempCode}\nIt expires in 5 minutes.`,
      };
      sgMail.send(message).catch((err) => console.error(err));
    }

    res.status(200).json({ message: "Temporary code sent to staff email", staff: { id: staff._id, isVerified: staff.isVerified } });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyStaffLogin = async (req, res) => {
  try {
    const { staffId, code } = req.body;
    const hospitalIT = await HospitalIT.findOne({ "staffAccounts._id": staffId });
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });

    const staff = hospitalIT.staffAccounts.id(staffId);
    if (!staff.tempLoginCode || Date.now() > staff.tempLoginExpires) return res.status(400).json({ message: "Code expired or not set" });
    if (staff.tempLoginCode !== code) return res.status(401).json({ message: "Invalid code" });

    staff.isVerified = true;
    staff.tempLoginCode = undefined;
    staff.tempLoginExpires = undefined;
    await hospitalIT.save();

    const token = jwt.sign(
      { staffId: staff._id, role: staff.role, hospitalItId: hospitalIT._id },
      process.env.JWT_SECRETE || 'fallback_secret',
      { expiresIn: process.env.EXPIRES_IN || '1d' }
    );
    res.status(200).json({ message: "Login successful", token, staff: { id: staff._id, name: staff.name, role: staff.role } });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const departments = await HospitalIT.find().select("staffAccounts");
    let allStaff = [];
    departments.forEach(dept => {
      allStaff = allStaff.concat(dept.staffAccounts);
    });
    if (allStaff.length === 0) return res.status(404).json({ message: "No staff found system-wide" });
    res.status(200).json({ message: "Staff fetched successfully", staff: allStaff });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalIT = await HospitalIT.findOneAndUpdate(
      { "staffAccounts._id": id },
      { $pull: { staffAccounts: { _id: id } } },
      { new: true }
    );
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });
    res.status(200).json({ message: "Staff deleted successfully from nested array" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const disableStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalIT = await HospitalIT.findOneAndUpdate(
      { "staffAccounts._id": id },
      { $set: { "staffAccounts.$.isdisabled": true } },
      { new: true }
    );
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });
    res.status(200).json({ message: "Staff disabled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkStaffActivity = async (req, res) => {
  try {
    const today = new Date();
    const hospitals = await HospitalIT.find();

    for (const hospital of hospitals) {
      let isModified = false;
      hospital.staffAccounts.forEach(staff => {
        const lastQueryDate = new Date(staff.lastquerry || hospital.createdAt);
        const diffDays = Math.floor((today - lastQueryDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7 && staff.isactive) {
          staff.isactive = false;
          isModified = true;
        }
      });
      if(isModified) await hospital.save();
    }
    res.status(200).json({ message: "Staff activity checked and updated locally." });
  } catch (err) {
    res.status(500).json({ message: "Server error updating staff activity." });
  }
};

const getInactiveStaffs = async (req, res) => {
  try {
    const departments = await HospitalIT.find({ "staffAccounts.isactive": false }).select("staffAccounts");
    let inactiveStaff = [];
    departments.forEach(dept => {
      inactiveStaff = inactiveStaff.concat(dept.staffAccounts.filter(s => s.isactive === false));
    });
    res.status(200).json({ message: "Inactive staff retrieved successfully", data: inactiveStaff });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching inactive staff" });
  }
};

const getActiveStaffs = async (req, res) => {
  try {
    const departments = await HospitalIT.find({ "staffAccounts.isactive": true }).select("staffAccounts");
    let activeStaff = [];
    departments.forEach(dept => {
      activeStaff = activeStaff.concat(dept.staffAccounts.filter(s => s.isactive === true));
    });
    res.status(200).json({ message: "Active staff retrieved successfully", data: activeStaff });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching active staff" });
  }
};

const sendStaffDetails = async (req, res) => {
  try {
    const { staffId } = req.params;
    const hospitalIT = await HospitalIT.findOne({ "staffAccounts._id": staffId });
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });

    const staff = hospitalIT.staffAccounts.id(staffId);
    if(process.env.SENDGRID_API) {
      sgMail.setApiKey(process.env.SENDGRID_API);
      const msg = {
        from: process.env.MAIL_USER || process.env.EMAIL_USER || 'no-reply@medsec.com',
        to: staff.email,
        subject: "Staff Registration Details",
        text: `Hello ${staff.name},\nYou have been registered successfully as ${staff.role}.\nYour Staff Code is: ${staff.staffCode}`,
      };
      await sgMail.send(msg);
    }
    res.status(200).json({ message: `Staff details sent to ${staff.email}` });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const editStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) return res.status(400).json({ message: "No update fields provided" });
    
    const setQuery = {};
    for (const key in updates) {
      setQuery[`staffAccounts.$.${key}`] = updates[key];
    }

    const hospitalIT = await HospitalIT.findOneAndUpdate(
      { "staffAccounts._id": id },
      { $set: setQuery },
      { new: true, runValidators: true }
    );
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });

    res.status(200).json({ message: "Staff updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const revokeStaffAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalIT = await HospitalIT.findOneAndUpdate(
      { "staffAccounts._id": id },
      { $set: { "staffAccounts.$.revokedAccess": true } },
      { new: true }
    );
    if (!hospitalIT) return res.status(404).json({ message: "Staff not found" });
    res.status(200).json({ message: "Staff access revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.newPassword, salt);

    const hospitalIT = await HospitalIT.findOneAndUpdate(
      { "staffAccounts._id": id },
      { $set: { "staffAccounts.$.password": hashedPassword, "staffAccounts.$.hasChangedPassword": true } },
      { new: true }
    );
    if (!hospitalIT) return res.status(404).json({ error: "Staff not found" });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error while resetting password" });
  }
};

module.exports = {
  registerStaff, loginStaff, verifyStaffLogin, getAllStaff, deleteStaffById,
  disableStaff, checkStaffActivity, getInactiveStaffs, getActiveStaffs,
  sendStaffDetails, editStaffById, revokeStaffAccess, resetStaffPassword
};
