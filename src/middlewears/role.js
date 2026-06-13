const CheckroleonAll = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  // const allowedRoles = ["Admin", "Manager"];
  // if (!allowedRoles.includes(req.user.role)) {
  //   return res.status(403).json({ message: "Unauthorized access" });
  // }

  // next();
};

const higherAuth = (req, res, next) => {
  // Allowed roles
  const allowedRoles = ["MIST DEVELOPER", "superior manager","MIST MANAGER"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  next();
};

const higherAuth2 = (req, res, next) => {
  // Allowed roles
  const allowedRoles = ["MIST DEVELOPER", "superior manager"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  next();
};

const OnlySuperiorManager = (req, res, next) => {
  if (req.user.role !== "superior manager") {
    return res.status(403).json({ message: "Unauthorized access" });
  }
  next();
};

const checkroleonAll = (req, res, next) => {
  if (
    req.user.role !== "Admin" &&
    req.user.role !== "Staff" &&
    req.user.role !== "Manager"
  ) {
    return res.status(403).json({ message: "Unauthorized access" });
  }
  next();
};

module.exports = { CheckroleonAll, checkroleonAll, higherAuth,OnlySuperiorManager ,higherAuth2};
