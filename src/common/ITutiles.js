const HospitalIT = require("../models/itAdmin/it.depart");
const Patient = require("../models/patients/patients"); // Adjust relative path to your patient model
const ITActionLog = require("../models/itAdmin/ItAdminActionLogs");

const logITAction = async (
  userId,
  action,
  entityId = null,
  entityType = "HospitalIT",
  path = "HospitalIT",
  hospitalId = null,
  status = "Successful",
) => {
  try {
    let actorName = "Unknown User";
    let targetName = "Unknown Target";
    let resolvedHospitalId = hospitalId;
 

    // 1. Resolve Actor Details (HospitalIT Staff) and Hospital ID
    if (path === "HospitalIT" && userId) {
      const staffActor = await HospitalIT.findById(userId);
      actorName = staffActor?.staffAccounts?.name || "Unknown Staff";
      if (!resolvedHospitalId) {
        resolvedHospitalId = staffActor?.hospital;
      }
    }

    // 2. Dynamically Resolve Target Name (Patient vs. HospitalIT)
    if (entityId) {
      if (entityId.toString() === userId?.toString()) {
        targetName = actorName;
      } else if (entityType === "Patient") {
        // Look up target directly in Patient collection using patient.name
        const patient = await Patient.findById(entityId);
        targetName = patient?.name || "Unknown Patient";
      } else {
        // Look up target in HospitalIT collection
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
      }
    }

    // 3. Build Audit Message
    let message = "";
    switch (action) {
      case "LOGIN": {
        message =
          status === "Failed"
            ? `Failed login attempt for ${actorName}`
            : `${actorName} logged in successfully`;
        break;
      }
      // Staff management cases
      case "BLOCK_STAFF":
      case "SUSPEND_ACCOUNT": {
        message = `${actorName} suspended account access for ${targetName}`;
        break;
      }
      case "UNBLOCK_STAFF":
      case "REACTIVATE_ACCOUNT": {
        message = `${actorName} restored account access for ${targetName}`;
        break;
      }
      case "LOCK_ACCOUNT": {
        message = `${actorName} locked account access for ${targetName}`;
        break;
      }
      case "RESET_PASSWORD": {
        message = `${actorName} reset password for ${targetName}`;
        break;
      }
      case "EDIT_STAFF": {
        message = `${actorName} edited the profile of ${targetName}`;
        break;
      }
      case "CREATE_STAFF": {
        message = `${actorName} registered a new staff profile for ${targetName}`;
        break;
      }
      // Patient management cases
      case "CREATE_PATIENT": {
        message = `${actorName} registered a new patient record for ${targetName}`;
        break;
      }
      case "EDIT_PATIENT": {
        message = `${actorName} updated patient record for ${targetName}`;
        break;
      }
      case "DELETE_PATIENT": {
        message = `${actorName} removed patient record for ${targetName}`;
        break;
      }
      default:
        message = `${actorName} executed ${action} on ${targetName}`;
    }

    // 4. Save to Database
    await ITActionLog.create({
      hospital: resolvedHospitalId,
      userId,
      path,
      action,
      entityId,
      entityType: entityType || "HospitalIT",
      status,
      message,
    });
  } catch (err) {
    console.error("Error writing IT action log:", err.message);
  }
};

module.exports = logITAction;
