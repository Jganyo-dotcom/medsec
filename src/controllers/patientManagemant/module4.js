// const Prescription = require("../../models/prescription");
// const Patient = require("../../models/patients");

// // Prescribe a new drug
// const prescribeDrug = async (req, res) => {
//   try {
//     const {
//       patient,
//       drug,
//       dose,
//       route,
//       frequency,
//       duration,
//       allergyAlert,
//       interactionAlert,
//       verifiedBy, // usually the doctor ID ordering it, schema says verifiedBy
//     } = req.body;

//     const newPrescription = new Prescription({
//       patient,
//       drug,
//       dose,
//       route,
//       frequency,
//       duration,
//       allergyAlert: allergyAlert || false,
//       interactionAlert: interactionAlert || false,
//       status: "Pending Verification",
//       verifiedBy, 
//     });

//     await newPrescription.save();

//     // Optionally update the patient's inline array
//     await Patient.findByIdAndUpdate(patient, {
//       $push: {
//         prescriptions: {
//           date: new Date(),
//           drugName: drug,
//           dosage: dose,
//           duration: duration,
//           prescribedBy: verifiedBy,
//         },
//       },
//     });

//     res.status(201).json({ message: "Drug prescribed successfully", data: newPrescription });
//   } catch (error) {
//     res.status(500).json({ message: "Error prescribing drug", error: error.message });
//   }
// };

// // Get prescription queue
// const getPrescriptions = async (req, res) => {
//   try {
//     const { status } = req.query; // e.g. "Pending Verification", "Available", "Dispensed"
//     const filter = {};
//     if (status) {
//       filter.status = status;
//     }

//     const queue = await Prescription.find(filter)
//       .populate("patient", "name dob")
//       .populate("verifiedBy", "name")
//       .sort({ createdAt: -1 });

//     res.status(200).json({ message: "Prescription queue retrieved", data: queue });
//   } catch (error) {
//     res.status(500).json({ message: "Error retrieving prescriptions", error: error.message });
//   }
// };

// // Update prescription workflow status
// const updatePrescriptionStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       status, // "Available" or "Dispensed"
//       pharmacistNotes,
//       drugChart,
//       verifiedBy, // pharmacist ID
//     } = req.body;

//     const updateData = {};
//     if (status) updateData.status = status;
//     if (pharmacistNotes) updateData.pharmacistNotes = pharmacistNotes;
//     if (drugChart) updateData.drugChart = drugChart;
//     if (verifiedBy) updateData.verifiedBy = verifiedBy;

//     const updatedPrescription = await Prescription.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true }
//     );

//     if (!updatedPrescription) {
//       return res.status(404).json({ message: "Prescription not found" });
//     }

//     res.status(200).json({ message: "Prescription updated successfully", data: updatedPrescription });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating prescription", error: error.message });
//   }
// };

// module.exports = {
//   prescribeDrug,
//   getPrescriptions,
//   updatePrescriptionStatus,
// };
