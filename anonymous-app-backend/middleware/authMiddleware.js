const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminMember = require("../models/AdminMember");
const { getAdminPanelCredentials } = require("../utils/admin");

module.exports = async (req, res, next) => {
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

    if (decoded?.kind === "admin_panel") {
      const credentials = getAdminPanelCredentials();
      if (decoded.source === "env") {
        if (!credentials.email || decoded.email !== credentials.email) {
          return res.status(401).json({
            error: {
              code: "TOKEN_INVALID",
              message: "Admin session is no longer valid",
              status: 401,
            },
          });
        }

        req.user = {
          id: null,
          wallet: null,
          email: credentials.email,
          isAdmin: true,
          isBanned: false,
          authType: "password",
          role: "owner",
          source: "env",
          adminMemberId: null,
        };
        next();
        return;
      }

      const adminMember = decoded.memberId
        ? await AdminMember.findById(decoded.memberId)
        : await AdminMember.findByEmail(decoded.email);

      if (
        !adminMember ||
        !adminMember.isActive ||
        adminMember.email !== decoded.email
      ) {
        return res.status(401).json({
          error: {
            code: "TOKEN_INVALID",
            message: "Admin member session is no longer valid",
            status: 401,
          },
        });
      }

      req.user = {
        id: null,
        wallet: null,
        email: adminMember.email,
        isAdmin: true,
        isBanned: false,
        authType: "password",
        role: adminMember.role,
        source: "member",
        adminMemberId: adminMember.id,
      };
      next();
      return;
    }

    const accessContext = await User.getAccessContext(decoded.sub);
    if (!accessContext) {
      return res.status(401).json({
        error: {
          code: "TOKEN_INVALID",
          message: "Session user no longer exists",
          status: 401,
        },
      });
    }

    if (accessContext.isBanned) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_BANNED",
          message:
            accessContext.bannedReason ||
            "This wallet has been banned by an admin",
          status: 403,
        },
      });
    }

    req.user = {
      id: accessContext.id,
      wallet: accessContext.walletAddress,
      email: accessContext.email || null,
      isAdmin: accessContext.isAdmin,
      isBanned: accessContext.isBanned,
      authType: accessContext.authType || "wallet",
      role: "admin",
      source: accessContext.authType || "wallet",
      adminMemberId: null,
    };
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
