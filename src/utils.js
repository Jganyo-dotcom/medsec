const User = require("./models/manager/manager");
const Hospital = require("./models/hospital.schema");
const ActionLog = require("./models/manager/managerAuditLog");

const logAction = async (userId, action, entityId, entityType) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    let message = "";
    let hospital;

    switch (action) {
      case "CREATE_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${user.name} created hospital ${hospital?.hospitalDetails?.name}`;
        break;

      case "SENT_HOSPITAL_DETAILS":
        hospital = await Hospital.findById(entityId);
        message = `${user.name} sent ${hospital?.hospitalDetails?.name} details`;
        break;

      case "SUSPEND_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${user.name} suspended ${hospital?.hospitalDetails?.name} `;
        break;

      case "ENABLED_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${user.name} enabled ${hospital?.hospitalDetails?.name}`;
        break;

      default:
        message = `${user.name} performed ${action}`;
    }

    await ActionLog.create({ userId, action, entityId, entityType, message });
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

module.exports ={ logAction,getSafeFields}
