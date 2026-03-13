const Hospitals = require("../../models/hospital.schema");
const validateCreateHospital = require("../../validations/manager validations/validations");
const bcrypt = require("bcrypt");

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

module.exports = {
  registerHospital,
  getAllHospitals,
  deleteHospitalById,
  disableHospital,
};
