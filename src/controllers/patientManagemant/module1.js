const patientBasicValidation = require("../../validations/staff validation/mod1");
const Patient = require("../../models/patients");

// Create new patient
const createPatient = async (req, res) => {
  try {
    const { error, value } = patientBasicValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const {
      name,
      dob,
      phone,
      addresse,
      occupation,
      tribe,
      informant,
      gender,
      wardAssignment,
    } = req.body;

    const patient = new Patient({
      name,
      dob,
      phone,
      addresse,
      occupation,
      tribe,
      informant,
      gender,
      wardAssignment,
      createdBy: req.user.staff,
      hospitalCode: req.user.hospitalCode,
      date: new Date(), // ensure schema-required field
      time: new Date().toLocaleTimeString(),
    });

    await patient.save();
    res.status(201).json({ message: "Patient created successfully", patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating patient" });
  }
};

// Get all patients (with pagination)
const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, q } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = q ? { name: { $regex: q, $options: "i" } } : {};

    const patients = await Patient.find(query)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Patient.countDocuments(query);

    res.status(200).json({
      items: patients,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching patients" });
  }
};

// Get patient by ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.status(200).json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching patient" });
  }
};

module.exports = { createPatient, getAllPatients };
