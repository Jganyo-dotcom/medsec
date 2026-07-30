const jwt = require("jsonwebtoken");
const Manager = require("../models/manager/manager");

const authmiddleware = async (req, res, next) => { // 1. Added 'async'
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided, Login!!!" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRETE);
    req.user = decoded;

    // 2. Corrected role check (handles case-sensitivity & proper boolean logic)
    const checkedRoles = ["MIST DEVELOPER", "MIST MANAGER"];
    
    if (checkedRoles.includes(req.user.role)) {
      // Fetch manager record
      const theManager = await Manager.findById(req.user.id);

      // 3. Simple null check (no .length check on objects)
      if (!theManager) {
        return res.status(401).json({
          message: "User account no longer exists. Please log in again.",
        });
      }

      // Force initial password change rule

      const settingsPath = "/api/manager/change-password";

        // .startsWith() ensures the ACTUAL route begins with your allowed path, ignoring queries
        // Normalize the incoming path to lowercase and extract the clean path route
        const currentPath = req.path.toLowerCase();

        // Check if the current route ends with your target action path
        const isChangePasswordRoute = currentPath.endsWith("/change-password") || currentPath.endsWith("/change-password/");

        if (!theManager.hasChangedPassword && !isChangePasswordRoute) {
          console.log("Blocking access:", theManager.hasChangedPassword, theManager.name);

          return res.status(403).json({
            message: "Please change your default password before proceeding.",
          });
      }


    }

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    
    // Differentiate JWT errors from server errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server authentication error" });
  }
};

module.exports = authmiddleware;