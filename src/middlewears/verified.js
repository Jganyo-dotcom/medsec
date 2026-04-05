// verifyAccountMiddleware.js
const verifyAccountMiddleware = (req, res, next) => {
  try {
    // req.user was set by authmiddleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: no user in request" });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    // If verified, continue
    next();
  } catch (err) {
    console.error("Verification middleware error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = verifyAccountMiddleware;
