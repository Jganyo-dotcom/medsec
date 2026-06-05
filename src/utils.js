const User = require("./models/manager/manager");
const Hospital = require("./models/hospital.schema");
const ActionLog = require("./models/manager/managerAuditLog");

const logAction = async (userId, action, entityId, entityType, path = "Manager") => {
  try {
    let actorName = "";
    let actorEmail = "";
    let hospital;

    if (path === "Hospital") {
      // Actor is a hospital
      hospital = await Hospital.findById(userId);
      if (!hospital) throw new Error("Hospital not found");
      actorName = hospital.hospitalRep.name;
      actorEmail = hospital.hospitalRep.email;
    } else {
      // Actor is a manager/user
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      actorName = user.name;
      actorEmail = user.email;
    }

    let message = "";
    let hospitalSnapshot = null;

    if (entityType === "Hospital") {
      hospital = await Hospital.findById(entityId);
      if (hospital) {
        hospitalSnapshot = {
          name: hospital.hospitalDetails.name,
          code: hospital.hospitalDetails.code,
          address: hospital.hospitalDetails.addresse,
          phone: hospital.hospitalDetails.contact.phone,
          email: hospital.hospitalDetails.contact.email
        };
      }
    }

    switch (action) {
      case "CREATE_HOSPITAL":
        message = `${actorName} created hospital ${hospitalSnapshot?.name}`;
        break;

      case "SENT_HOSPITAL_DETAILS":
        message = `${actorName} sent ${hospitalSnapshot?.name} details`;
        break;

      case "SUSPEND_HOSPITAL":
        message = `${actorName} suspended ${hospitalSnapshot?.name}`;
        break;

      case "ENABLED_HOSPITAL":
        message = `${actorName} enabled ${hospitalSnapshot?.name}`;
        break;

      case "ATTEMPTED_TO_VERIFY_ACCOUNT":
        message = `${hospitalSnapshot?.name} initiated the verification process`;
        break;

      case "ATTEMPTED_TO_VERIFY_ACCOUNT_AGAIN":
        message = `${hospitalSnapshot?.name} attempted the verification process again`;
        break;

      default:
        message = `${actorName} performed ${action}`;
    }

    await ActionLog.create({
      userId,
      path,
      action,
      entityId,
      entityType,
      message,
      hospitalSnapshot // snapshot stored here
    });
  } catch (err) {
    console.error("Error logging action:", err.message);
  }
};

function getSafeFields(entityType) {
  switch (entityType) {
    case "Hospital":
      return "hospitalDetails hospitalRep.name hospitalRep.phone hospitalRep.email";
    case "User":
      return "name email role"; // exclude password
    case "Manager":
      return "name email department";
    default:
      return ""; // no extra fields
  }
}

module.exports = { logAction, getSafeFields };
