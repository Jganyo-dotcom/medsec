const Hospitals = require("../../models/hospital.schema");
const validateCreateHospital = require("../../validations/manager validations/validations");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

const loginHospital = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Identifier and password are required" });
    }

    const hospital = await Hospitals.findOne({
      $or: [
        { "hospitalDetails.code": identifier },
        { "hospitalDetails.contact.email": identifier },
      ],
    });

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    if (hospital.isdisabled || hospital.hospitalRep.revokedAccess) {
      return res
        .status(403)
        .json({ message: "Access revoked or hospital disabled" });
    }

    const isMatch = await bcrypt.compare(
      password,
      hospital.hospitalRep.password,
    );
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (hospital.isVerified) {
      const token = jwt.sign(
        { hospitalId: hospital._id, role: hospital.hospitalRep.role,hospialCode:hospital.hospitalDetails.role },
        process.env.JWT_SECRETE,
        { expiresIn: process.env.EXPIRES_IN },
      );

      return res.status(200).json({
        message: "Login successful",
        token,
        hospital: {
          id: hospital._id,
          name: hospital.hospitalDetails.name,
          code: hospital.hospitalDetails.code,
          email: hospital.hospitalDetails.contact.email,
          rep: hospital.hospitalRep.name,
          role: hospital.hospitalRep.role,
          isVerified: hospital.isVerified,
        },
      });
    }

    // Generate temporary code (6 digits)
    const tempCode = crypto.randomInt(100000, 999999).toString();

    // Save temp code with short expiry (e.g. 5 minutes)
    hospital.tempLoginCode = tempCode;
    hospital.tempLoginExpires = Date.now() + 5 * 60 * 1000;
    await hospital.save();

    // Send email with temp code
    sgMail.setApiKey(process.env.SENDGRID_API);

    const message = {
      from: process.env.MAIL_USER,
      to: hospital.hospitalDetails.contact.email,
      subject: "Your Hospital Login Code",
      text: `Hello ${hospital.hospitalRep.name},\n\nYour temporary login code is: ${tempCode}\nIt expires in 5 minutes.\nIf you didnt authorise this please contact elikemejay@gmail.com\nBest regards,\nAttendance System`,
    };

    sgMail
      .send(message)
      .then(() => {
        console.log(`Email sent to ${hospital.hospitalDetails.contact.email}`);
      })
      .catch((err) => {
        console.error("Error sending email:", err.response.body.errors);
      });

    res.status(200).json({
      message: "Temporary code sent to hospital email",
      hospital: {
        id: hospital._id,
        isVerified: hospital.isVerified,
      },
    });
  } catch (err) {
    console.error("Error logging in hospital:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyHospitalLogin = async (req, res) => {
  try {
    const { hospitalId, code } = req.body;

    const hospital = await Hospitals.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    if (!hospital.tempLoginCode || Date.now() > hospital.tempLoginExpires) {
      return res.status(400).json({ message: "Code expired or not set" });
    }

    if (hospital.tempLoginCode !== code) {
      return res.status(401).json({ message: "Invalid code" });
    }

    await Hospitals.findByIdAndUpdate(hospitalId, {
      isVerified: true,
    });

    // Clear temp code
    hospital.tempLoginCode = undefined;
    hospital.tempLoginExpires = undefined;
    await hospital.save();

    // Generate JWT token
    const token = jwt.sign(
      { hospitalId: hospital._id, role: hospital.hospitalRep.role },
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      hospital: {
        id: hospital._id,
        name: hospital.hospitalDetails.name,
        code: hospital.hospitalDetails.code,
        email: hospital.hospitalDetails.contact.email,
        rep: hospital.hospitalRep.name,
        role: hospital.hospitalRep.role,
      },
    });
  } catch (err) {
    console.error("Error verifying hospital login:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper: Generate hospital code
async function generateHospitalCode(hospitalName, address) {
  const words = hospitalName.trim().split(/\s+/);
  const acronym = words.map((w) => w[0].toUpperCase()).join("");

  const locationPart =
    address.slice(0, 2).toUpperCase() + Math.floor(10 + Math.random() * 90); // 2 letters + 2 digits

  const timestampPart = Date.now().toString().slice(-4); // last 4 digits of timestamp

  const letters = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");

  return `${acronym}-${locationPart}-${timestampPart}-${letters}`;
}

const registerHospital = async (req, res) => {
  try {
    const {
      h_name,
      addresse,
      h_phone,
      h_email,
      r_name,
      r_phone,
      r_email,
      r_password,
      r_confirm_password,
    } = req.body;

    // Validate input
    const { error, value } = validateCreateHospital.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Password confirmation check
    if (value.r_password !== value.r_confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if hospital already exists
    const findExistingAccount = await Hospitals.findOne({
      "hospitalName.contact.email": value.h_email,
      "hospitalRep.email": value.r_email,
    });

    // Check if hospital address exists
    const findExistingAddress = await Hospitals.findOne({
      "hospitalDetails.addresse": value.h_addresse,
    });

    if (findExistingAddress) {
      return res.status(400).json({ message: "Addresse already exists" });
    }

    if (findExistingAccount) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(value.r_password, salt);

    // Generate unique hospital code with retry
    let h_code;
    let exists = true;
    while (exists) {
      h_code = await generateHospitalCode(value.h_name, value.addresse);
      exists = await Hospitals.findOne({ "hospitalName.code": h_code });
    }

    // Create new hospital
    const newHospital = new Hospitals({
      hospitalDetails: {
        name: value.h_name,
        code: h_code,
        addresse: value.addresse,
        contact: {
          phone: value.h_phone,
          email: value.h_email,
        },
      },
      hospitalRep: {
        name: value.r_name,
        phone: value.r_phone,
        email: value.r_email,
        password: hashPassword,
        role: "Super Admin",
      },
      hasChangedPassword: false,
    });

    await newHospital.save();

    return res.status(201).json({
      message: "Hospital registered successfully",
      hospital: newHospital,
    });
  } catch (err) {
    console.error("Error registering hospital:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get all hospitals
const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospitals.find();

    if (!hospitals || hospitals.length === 0) {
      return res.status(404).json({ message: "No hospitals found" });
    }

    return res.status(200).json({
      message: "Hospitals fetched successfully",
      hospitals,
    });
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//  delete hospital by ID
const deleteHospitalById = async (req, res) => {
  try {
    const { id } = req.params; // hospital ID from URL

    const hospital = await Hospitals.findByIdAndDelete(id);

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

const disableHospital = async (req, res) => {
  try {
    const { id } = req.params;

    const hospital = await Hospitals.findByIdAndUpdate(
      id,
      { isdisabled: true },
      { new: true }, // return updated document
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    return res.status(200).json({
      message: "Hospital disabled successfully",
      hospital: {
        id: hospital._id,
        name: hospital.hospitalName.name,
        code: hospital.hospitalName.code,
        isdisabled: hospital.isdisabled,
      },
    });
  } catch (err) {
    console.error("Error disabling hospital:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const IsactiveHospital = async (req, res) => {
  try {
    const today = new Date();
    const hospitals = await Hospitals.find({});

    for (const hospital of hospitals) {
      const lastQueryDate = new Date(hospital.lastquerry);
      const diffDays = Math.floor(
        (today - lastQueryDate) / (1000 * 60 * 60 * 24),
      );

      if (diffDays >= 7) {
        await Hospitals.findByIdAndUpdate(hospital._id, { isactive: false });
      }
    }

    res.status(200).json({ message: "Hospital activity checked and updated." });
  } catch (err) {
    console.error("Error updating hospital activity:", err);
    res
      .status(500)
      .json({ message: "Server error updating hospital activity." });
  }
};

const getInactiveHospitals = async (req, res) => {
  try {
    const inactiveHospitals = await Hospitals.find({ isactive: false });
    res.status(200).json({
      message: "Inactive hospitals retrieved successfully",
      data: inactiveHospitals,
    });
  } catch (err) {
    console.error("Error fetching inactive hospitals:", err);
    res
      .status(500)
      .json({ message: "Server error fetching inactive hospitals" });
  }
};

const getactiveHospitals = async (req, res) => {
  try {
    const activeHospitals = await Hospitals.find({ isactive: true });
    res.status(200).json({
      message: "active hospitals retrieved successfully",
      data: activeHospitals,
    });
  } catch (err) {
    console.error("Error fetching active hospitals:", err);
    res.status(500).json({ message: "Server error fetching active hospitals" });
  }
};

// Send hospital details to rep email
const sendHospitalDetails = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    // Find hospital by ID
    const hospital = await Hospitals.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Configure mail transport
    // const transporter = nodemailer.createTransport({
    //   service: "gmail", // or use SMTP config
    //   auth: {
    //     user: process.env.MAIL_USER,
    //     pass: process.env.MAIL_PASS,
    //   },
    // });

    // Build email content

    sgMail.setApiKey(process.env.SENDGRID_API);

    const msg = {
      from: process.env.MAIL_USER,
      to: hospital.hospitalRep.email,
      subject: "Hospital Registration Details",
      text: `
Hello ${hospital.hospitalRep.name},


Your hospital has been registered successfully.

Hospital Name: ${hospital.hospitalDetails.name}
Hospital Code: ${hospital.hospitalDetails.code}
Address: ${hospital.hospitalDetails.addresse}
Phone: ${hospital.hospitalDetails.contact.phone}
Email: ${hospital.hospitalDetails.contact.email}

Rep Name: ${hospital.hospitalRep.name}
Rep Phone: ${hospital.hospitalRep.phone}
Rep Email: ${hospital.hospitalRep.email}
your temporary password is "ctrl+createLabs"

Best regards,
From ctrl + create team
      `,
    };

    // Send email
    await sgMail.send(msg);
    console.log(hospital.hospitalRep.email)

    return res
      .status(200)
      .json({ message: `Hospital details sent to ${hospital.hospitalRep.email}` });

    res.status(200).json({ message: "Hospital details sent to rep email" });
  } catch (err) {
    console.error("Error sending hospital details:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Edit hospital details (PATCH)
const updateHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const updates = req.body;

    // Guard against empty updates
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update fields provided" });
    }

    // Apply updates safely
    const updatedHospital = await Hospitals.findByIdAndUpdate(
      hospitalId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!updatedHospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.status(200).json({
      message: "Hospital updated successfully",
      hospital: updatedHospital,
    });
  } catch (err) {
    console.error("Error updating hospital:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Revoke hospital rep access by hospital ID
const revokeHospitalAdminAccess = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const updatedHospital = await Hospitals.findByIdAndUpdate(
      hospitalId,
      { $set: { "hospitalRep.revokedAccess": true } },
      { new: true, runValidators: true },
    );

    if (!updatedHospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.status(200).json({
      message: "Hospital rep access revoked successfully",
      hospital: updatedHospital,
    });
  } catch (err) {
    console.error("Error revoking hospital rep access:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get total staff across all hospitals
// const getTotalStaff = async (req, res) => {
//   try {
//     const hospitals = await Hospitals.find({});
//     let totalStaff = 0;

//     hospitals.forEach((h) => {
//       totalStaff += h.staffAccounts.length;
//     });

//     res.status(200).json({
//       message: "Total staff across system",
//       totalStaff,
//     });
//   } catch (err) {
//     console.error("Error calculating total staff:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

module.exports = {
  registerHospital,
  loginHospital,
  verifyHospitalLogin,
  getAllHospitals,
  deleteHospitalById,
  disableHospital,
  IsactiveHospital,
  getInactiveHospitals,
  getactiveHospitals,
  sendHospitalDetails,
  updateHospital,
  revokeHospitalAdminAccess,
  // getTotalStaff,
};
