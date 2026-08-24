const HospitalIT = require("../models/itAdmin/it.depart");
const ITActionLog = require("../models/itAdmin/ItAdminActionLogs");

const logITAction = async (
  userId,
  action,
  entityId,
  entityType,
  path = "HospitalIT",
  hospitalId = null,
  status = "Successful",
) => {
  try {
    let actorName = "Unknown User";
    let targetName = "Unknown Target";
    let resolvedHospitalId = hospitalId;

    // 1. Resolve Actor Details and Hospital ID
    if (path === "HospitalIT") {
      const staffActor = await HospitalIT.findById(userId);
      actorName = staffActor?.staffAccounts?.name || "Unknown Staff";
      if (!resolvedHospitalId) {
        resolvedHospitalId = staffActor?.hospital;
      }
    }

    // 2. Build Human-Readable Audit Message
    let message = "";
    switch (action) {
      case "EDIT_STAFF": {
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
        message = `${actorName} edited the profile of ${targetName}`;
        break;
      }
      case "CREATE_STAFF": {
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
        message = `${actorName} registered a new staff profile for ${targetName}`;
        break;
      }
      case "BLOCK_STAFF": {
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
        message = `${actorName} suspended account access for ${targetName}`;
        break;
      }
      case "UNBLOCK_STAFF": {
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
        message = `${actorName} restored account access for ${targetName}`;
        break;
      }
      case "RESET_PASSWORD": {
        const targetStaff = await HospitalIT.findById(entityId);
        targetName = targetStaff?.staffAccounts?.name || "Unknown Staff";
        message = `${actorName} reset password for ${targetName}`;
        break;
      }
      default:
        message = `${actorName} executed ${action}`;
    }

    // 3. Persist Log Entry Scoped to Hospital
    await ITActionLog.create({
      hospital: resolvedHospitalId,
      userId,
      path,
      action,
      entityId,
      entityType,
      status,
      message,
    });
  } catch (err) {
    console.error("Error writing IT action log:", err.message);
  }
};

module.exports = logITAction;
