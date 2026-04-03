// middleware/authorize.js
const rolePermissions = {
  Doctor: ["fullPatientRecord"],
  Nurse: ["clinicalInput"],
  LabScientist: ["investigations"],
  Pharmacist: ["prescriptions"],
  Admin: ["systemSettings"],
};

const authorize = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role; // assume set by JWT auth middleware
      const permissions = rolePermissions[userRole] || [];

      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Authorization error" });
    }
  };
};

module.exports = { authorize, rolePermissions };
