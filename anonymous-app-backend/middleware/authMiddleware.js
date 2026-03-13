const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Authorization header missing",
        status: 401,
      },
    });
  }
  const [, token] = header.split(" ");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.sub, wallet: decoded.wallet };
    next();
  } catch (_error) {
    return res.status(401).json({
      error: {
        code: "TOKEN_INVALID",
        message: "Token invalid or expired",
        status: 401,
      },
    });
  }
};
