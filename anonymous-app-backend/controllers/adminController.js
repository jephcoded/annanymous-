const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const AdminMember = require("../models/AdminMember");
const {
  isAdminCredentialLoginEnabled,
  isValidAdminCredential,
  normalizeEmail,
} = require("../utils/admin");

const ensureOwnerAccess = (req, res) => {
  if (req.user?.authType !== "password" || req.user?.role !== "owner") {
    res.status(403).json({
      error: {
        code: "OWNER_REQUIRED",
        message: "Owner access required to manage admin members",
        status: 403,
      },
    });
    return false;
  }

  return true;
};

exports.loginWithCredentials = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "ADMIN_LOGIN_FIELDS_REQUIRED",
          message: "Email and password are required",
          status: 400,
        },
      });
    }

    if (!isAdminCredentialLoginEnabled()) {
      return res.status(503).json({
        error: {
          code: "ADMIN_LOGIN_NOT_CONFIGURED",
          message: "Admin email login is not configured on this backend",
          status: 503,
        },
      });
    }

    const isEnvOwner = isValidAdminCredential({ email, password });
    const member = isEnvOwner ? null : await AdminMember.authenticateMember({ email, password });

    if (!isEnvOwner && !member) {
      return res.status(401).json({
        error: {
          code: "ADMIN_LOGIN_INVALID",
          message: "Invalid admin email or password",
          status: 401,
        },
      });
    }

    const token = jwt.sign(
      isEnvOwner
        ? { kind: "admin_panel", role: "owner", email, source: "env" }
        : { kind: "admin_panel", role: member.role, email: member.email, source: "member", memberId: member.id },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );

    res.json({
      data: {
        token,
        authType: "password",
        email,
        role: isEnvOwner ? "owner" : member.role,
        source: isEnvOwner ? "env" : "member",
        adminMemberId: member?.id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    res.json({
      data: {
        authType: req.user.authType || "wallet",
        email: req.user.email || null,
        walletAddress: req.user.wallet || null,
        isAdmin: Boolean(req.user.isAdmin),
        role: req.user.role || "admin",
        source: req.user.source || req.user.authType || "wallet",
        adminMemberId: req.user.adminMemberId || null,
        canManageMembers: req.user.authType === "password" && req.user.role === "owner",
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.listMembers = async (req, res, next) => {
  try {
    if (!ensureOwnerAccess(req, res)) {
      return;
    }

    const members = await AdminMember.listMembers();
    const envOwner = isAdminCredentialLoginEnabled()
      ? [{
        id: "env-owner",
        email: normalizeEmail(process.env.ADMIN_PANEL_EMAIL),
        role: "owner",
        isActive: true,
        createdAt: null,
        updatedAt: null,
        lastLoginAt: null,
        createdByMemberId: null,
        createdByEmail: null,
        source: "env",
        immutable: true,
      }]
      : [];

    res.json({
      data: [...envOwner, ...members.map((member) => ({ ...member, source: "member", immutable: false }))],
    });
  } catch (error) {
    next(error);
  }
};

exports.createMember = async (req, res, next) => {
  try {
    if (!ensureOwnerAccess(req, res)) {
      return;
    }

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = req.body?.role === "owner" ? "owner" : "admin";

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "ADMIN_MEMBER_FIELDS_REQUIRED",
          message: "Email and password are required",
          status: 400,
        },
      });
    }

    const existing = await AdminMember.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: {
          code: "ADMIN_MEMBER_EXISTS",
          message: "An admin member with this email already exists",
          status: 409,
        },
      });
    }

    const member = await AdminMember.createMember({
      email,
      password,
      role,
      createdByMemberId: req.user.adminMemberId || null,
    });

    await Admin.logActivity({
      adminUserId: req.user.id,
      action: "create_admin_member",
      entityType: "admin_member",
      entityId: member.id,
      meta: {
        actorEmail: req.user.email,
        memberEmail: member.email,
        role: member.role,
      },
    });

    res.status(201).json({ data: { ...member, source: "member", immutable: false } });
  } catch (error) {
    next(error);
  }
};

exports.deactivateMember = async (req, res, next) => {
  try {
    if (!ensureOwnerAccess(req, res)) {
      return;
    }

    const memberId = Number(req.params.memberId);
    const member = await AdminMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        error: {
          code: "ADMIN_MEMBER_NOT_FOUND",
          message: "Admin member not found",
          status: 404,
        },
      });
    }

    if (req.user.adminMemberId && req.user.adminMemberId === member.id) {
      return res.status(400).json({
        error: {
          code: "OWNER_SELF_REMOVE_BLOCKED",
          message: "You cannot remove your own admin member account",
          status: 400,
        },
      });
    }

    if (member.role === "owner" && member.isActive) {
      const activeOwners = await AdminMember.countActiveOwners();
      if (activeOwners <= 1) {
        return res.status(400).json({
          error: {
            code: "LAST_OWNER_BLOCKED",
            message: "At least one active owner must remain",
            status: 400,
          },
        });
      }
    }

    const updatedMember = await AdminMember.setActiveState({ memberId: member.id, isActive: false });

    await Admin.logActivity({
      adminUserId: req.user.id,
      action: "remove_admin_member",
      entityType: "admin_member",
      entityId: updatedMember.id,
      meta: {
        actorEmail: req.user.email,
        memberEmail: updatedMember.email,
      },
    });

    res.json({ data: { ...updatedMember, source: "member", immutable: false } });
  } catch (error) {
    next(error);
  }
};

exports.activateMember = async (req, res, next) => {
  try {
    if (!ensureOwnerAccess(req, res)) {
      return;
    }

    const memberId = Number(req.params.memberId);
    const member = await AdminMember.findById(memberId);
    if (!member) {
      return res.status(404).json({
        error: {
          code: "ADMIN_MEMBER_NOT_FOUND",
          message: "Admin member not found",
          status: 404,
        },
      });
    }

    const updatedMember = await AdminMember.setActiveState({ memberId: member.id, isActive: true });

    await Admin.logActivity({
      adminUserId: req.user.id,
      action: "restore_admin_member",
      entityType: "admin_member",
      entityId: updatedMember.id,
      meta: {
        actorEmail: req.user.email,
        memberEmail: updatedMember.email,
      },
    });

    res.json({ data: { ...updatedMember, source: "member", immutable: false } });
  } catch (error) {
    next(error);
  }
};

exports.resetMemberPassword = async (req, res, next) => {
  try {
    if (!ensureOwnerAccess(req, res)) {
      return;
    }

    const memberId = Number(req.params.memberId);
    const password = String(req.body?.password || "");
    if (!password) {
      return res.status(400).json({
        error: {
          code: "ADMIN_MEMBER_PASSWORD_REQUIRED",
          message: "A new password is required",
          status: 400,
        },
      });
    }

    const member = await AdminMember.updatePassword({ memberId, password });
    if (!member) {
      return res.status(404).json({
        error: {
          code: "ADMIN_MEMBER_NOT_FOUND",
          message: "Admin member not found",
          status: 404,
        },
      });
    }

    await Admin.logActivity({
      adminUserId: req.user.id,
      action: "reset_admin_member_password",
      entityType: "admin_member",
      entityId: member.id,
      meta: {
        actorEmail: req.user.email,
        memberEmail: member.email,
      },
    });

    res.json({ data: { ...member, source: "member", immutable: false } });
  } catch (error) {
    next(error);
  }
};

exports.getOverview = async (req, res, next) => {
  try {
    const data = await Admin.getOverview({
      recentLimit: req.query.recentLimit,
      reportLimit: req.query.reportLimit,
      bannedLimit: req.query.bannedLimit,
      activityLimit: req.query.activityLimit,
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.getTrends = async (req, res, next) => {
  try {
    const data = await Admin.getTrends({
      days: req.query.days,
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await Admin.listUsers({
      query: req.query.query,
      limit: req.query.limit,
    });

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await Admin.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
          status: 404,
        },
      });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

exports.banUser = async (req, res, next) => {
  try {
    if (Number(req.params.userId) === req.user.id) {
      return res.status(400).json({
        error: {
          code: "ADMIN_SELF_BAN_BLOCKED",
          message: "You cannot ban the active admin wallet",
          status: 400,
        },
      });
    }

    const user = await Admin.banUser({
      targetUserId: req.params.userId,
      adminUserId: req.user.id,
      reason: req.body.reason,
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
          status: 404,
        },
      });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    const user = await Admin.unbanUser({
      targetUserId: req.params.userId,
      adminUserId: req.user.id,
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
          status: 404,
        },
      });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Admin.deletePost({
      postId: req.params.postId,
      adminUserId: req.user.id,
      reason: req.body.reason,
    });

    if (!post) {
      return res.status(404).json({
        error: {
          code: "POST_NOT_FOUND",
          message: "Post not found or already deleted",
          status: 404,
        },
      });
    }

    res.json({ data: post });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllPosts = async (req, res, next) => {
  try {
    if (req.body?.confirm !== "CLEAR_ALL_POSTS") {
      return res.status(400).json({
        error: {
          code: "ADMIN_CLEAR_POSTS_CONFIRM_REQUIRED",
          message: "Set confirm to CLEAR_ALL_POSTS to remove every active post",
          status: 400,
        },
      });
    }

    const result = await Admin.deleteAllPosts({
      adminUserId: req.user.id,
      reason: req.body.reason,
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const report = await Admin.resolveReport({
      reportId: req.params.reportId,
      adminUserId: req.user.id,
      resolutionNote: req.body.resolutionNote,
    });

    if (!report) {
      return res.status(404).json({
        error: {
          code: "REPORT_NOT_FOUND",
          message: "Report not found or already resolved",
          status: 404,
        },
      });
    }

    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};