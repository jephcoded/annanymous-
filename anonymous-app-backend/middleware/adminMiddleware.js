module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Authorization required",
        status: 401,
      },
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: {
        code: "ADMIN_REQUIRED",
        message: "Admin access required",
        status: 403,
      },
    });
  }

  next();
};