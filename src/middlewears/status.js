// accountStatusMiddleware.js
const accountStatusMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: no user in request" });
    }

    // Check if account is blocked
    if (req.user.blocked) {
      return res
        .status(403)
        .json({ message: "Account is blocked. Contact admin." });
    }

    // Check if password reset is required
    if (req.user.resetPassword) {
      return res
        .status(403)
        .json({ message: "Password reset required ." });
    }

    // If all checks pass
    next();
  } catch (err) {
    console.error("Account status middleware error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = accountStatusMiddleware;
