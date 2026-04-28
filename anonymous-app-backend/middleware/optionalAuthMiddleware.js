const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    next();
    return;
  }

  const [, token] = header.split(" ");
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.kind === "admin_panel") {
      next();
      return;
    }

    const accessContext = await User.getAccessContext(decoded.sub);
    if (accessContext && !accessContext.isBanned) {
      req.user = {
        id: accessContext.id,
        wallet: accessContext.walletAddress,
        email: null,
        isAdmin: accessContext.isAdmin,
        isBanned: accessContext.isBanned,
        authType: "wallet",
        role: "admin",
        source: "wallet",
        adminMemberId: null,
      };
    }
  } catch (_error) {
    // Ignore optional auth failures so anonymous feed access still works.
  }

  next();
};
