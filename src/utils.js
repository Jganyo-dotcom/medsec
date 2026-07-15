const User = require("./models/manager/manager");
const Hospital = require("./models/hospital.schema");
const ActionLog = require("./models/manager/managerAuditLog");
const { sendVerificationEmail } = require("./EmailTemplates/verificationMail");
const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

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

    switch (action) {
      case "CREATE_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${actorName} created hospital ${hospital?.hospitalDetails?.name}`;
        break;

      case "SENT_HOSPITAL_DETAILS":
        hospital = await Hospital.findById(entityId);
        message = `${actorName} sent ${hospital?.hospitalDetails?.name} details`;
        console.log(message)
        break;

      case "SUSPEND_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${actorName} suspended ${hospital?.hospitalDetails?.name}`;
        console.log(message)
        break;

      case "ENABLED_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${actorName} enabled ${hospital?.hospitalDetails?.name}`;
        console.log(message)
        break;

      case "ATTEMPTED_TO_VERIFY_ACCOUNT":
        hospital = await Hospital.findById(entityId);
        message = `${hospital?.hospitalDetails?.name} initiated the verification process`;
        console.log(message)
        break;

      case "ATTEMPTED_TO_VERIFY_ACCOUNT_AGAIN":
        hospital = await Hospital.findById(entityId);
        message = `${hospital?.hospitalDetails?.name} attempted the verification process again`;
        console.log(message)
        break;

      case "VERIFIED_ACCOUNT":
        hospital = await Hospital.findById(entityId);
        message = `${hospital?.hospitalDetails?.name} varified their hospital`;
        console.log(message)
        break;

      case "CREATED_HOSPITAL":
        hospital = await Hospital.findById(entityId);
        message = `${actorName} created  ${hospital?.hospitalDetails?.name}`;
        console.log(message)
        break;

      default:
        message = `${actorName} performed ${action}`;
        console.log(message)
    }

    await ActionLog.create({
      userId,
      path,
      action,
      entityId,
      entityType,
      message
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


const sendUniversalMail = async (type, options) => {
  const { recipientEmail, recipientName, subject, otpCode, personOrg ,custome} = options;
  const currentYear = new Date().getFullYear();

  // Basic input validation guard
  if (!recipientEmail || !recipientEmail.includes("@")) {
     console.error(`[Mail Aborted] Cannot send email. Address is invalid: ${recipientEmail}`);
    
    return null; // 🚀 CRITICAL FIX: Explicitly returns and halts execution instantly!
  }

  let htmlContent = "";

  // Select template explicitly based on strict type indicator
  if (type === "STAFF_VERIFICATION") {
    htmlContent = sendVerificationEmail(recipientName, otpCode, currentYear);
  } else if (type === "WE_MISSED_YOU") {
    htmlContent = getWeMissedUTemplate(recipientName, currentYear, personOrg);
  }else if (type === "Welcome_first_timers") {
    htmlContent = getWelcomeTemplate(recipientName, currentYear, personOrg);
  }
  else if (type === "forgetPassword") {
    htmlContent = forgetPasswordTemplate(custome, currentYear );
  }else {
    throw new Error(`Unknown email template type requested: ${type}`);
  }

  try {
    const data = await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email: recipientEmail, name: recipientName }],
      sender: { email: "elikemjjames@gmail.com", name: "CtrlCreate" },
      subject: subject,
      htmlContent: htmlContent,
    });

    console.log(`Email [${type}] successfully routed to ${recipientEmail}. Message ID:`, data.messageId);
    return data;
  } catch (error) {
    console.error(`Failed to route universal mail to ${recipientEmail}:`, error);
    throw error;
  }
};

module.exports ={ logAction,getSafeFields,sendUniversalMail}
