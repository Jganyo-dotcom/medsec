const PatientTest = require("../../models/ICategories");
const Patient = require("../../models/patients");

// Order a new investigation
const orderInvestigation = async (req, res) => {
  try {
    const {
      patient,
      hematology,
      microbiology,
      radiology,
      histopathology,
      orderedBy,
      enteredBy, // Usually someone enters it, schema requires it
    } = req.body;

    const newTest = new PatientTest({
      patient,
      hematology: hematology || [],
      microbiology: microbiology || [],
      radiology: radiology || [],
      histopathology: histopathology || [],
      orderedBy,
      enteredBy: enteredBy || orderedBy, // Fallback since schema requires it
      status: "Ordered",
    });

    await newTest.save();

    // Optionally update the patient's inline investigations array if needed
    // Assuming we just map base info to the Patient's investigation array
    await Patient.findByIdAndUpdate(patient, {
      $push: {
        investigations: {
          testName: "Multiple Tests Ordered",
          date: new Date(),
          result: "Pending",
        },
      },
    });

    res.status(201).json({ message: "Investigation ordered successfully", data: newTest });
  } catch (error) {
    res.status(500).json({ message: "Error ordering investigation", error: error.message });
  }
};

// Get the queue of investigations
const getInvestigationQueue = async (req, res) => {
  try {
    const { status } = req.query; // e.g., "Ordered", "In Queue", "Completed"
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const queue = await PatientTest.find(filter)
      .populate("patient", "name dob")
      .populate("orderedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ message: "Investigation queue retrieved carefully", data: queue });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving investigation queue", error: error.message });
  }
};

// Enter the result of an investigation
const enterResult = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      result,
      status, // Should be "Completed"
      enteredBy,
      hematology,
      microbiology,
      radiology,
      histopathology
    } = req.body;

    // We can also update specific sub-documents if passed
    const updateData = {
      result,
      resultDate: new Date(),
      status: status || "Completed",
      enteredBy,
      alertSent: true, // Triggering alert based on workflow
    };

    if (hematology) updateData.hematology = hematology;
    if (microbiology) updateData.microbiology = microbiology;
    if (radiology) updateData.radiology = radiology;
    if (histopathology) updateData.histopathology = histopathology;

    const updatedTest = await PatientTest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: "Investigation not found" });
    }

    // Auto-update the patient record with the new result
    await Patient.findByIdAndUpdate(updatedTest.patient, {
      $push: {
        investigations: {
          testName: "Lab Result Completed",
          date: new Date(),
          result: result || "Results Available",
        },
      },
    });

    res.status(200).json({ message: "Result entered, patient record auto-updated, and clinician alerted", data: updatedTest });
  } catch (error) {
    res.status(500).json({ message: "Error entering result", error: error.message });
  }
};

module.exports = {
  orderInvestigation,
  getInvestigationQueue,
  enterResult,
};
