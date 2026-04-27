const jwt = require("jsonwebtoken");
const helpers = require("../utils/helpers");
const User = require("../models/User");
const { isAdminWallet } = require("../utils/admin");

const USER_SESSION_TTL = process.env.USER_SESSION_TTL || "365d";

const signUserToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      wallet: user.wallet_address || null,
      email: user.email || null,
      authType: user.auth_type || "wallet",
    },
    process.env.JWT_SECRET,
    { expiresIn: USER_SESSION_TTL },
  );

const sanitizeUser = (user) => ({
  id: user.id,
  walletAddress: user.wallet_address || null,
  email: user.email || null,
  displayName: user.display_name || null,
  bio: user.bio || null,
  authType: user.auth_type || "wallet",
  isAdmin: isAdminWallet(user.wallet_address),
});

exports.signup = async (req, res, next) => {
  try {
    const { email, password, displayName, bio } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "SIGNUP_FIELDS_REQUIRED",
          message: "email and password are required",
          status: 400,
        },
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: {
          code: "PASSWORD_TOO_SHORT",
          message: "Password must be at least 6 characters",
          status: 400,
        },
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "EMAIL_IN_USE",
          message: "That email is already in use",
          status: 409,
        },
      });
    }

    const user = await User.createPasswordUser({
      email,
      password,
      displayName,
      bio,
    });
    const token = signUserToken(user);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "LOGIN_FIELDS_REQUIRED",
          message: "email and password are required",
          status: 400,
        },
      });
    }

    const user = await User.authenticatePasswordUser({ email, password });
    if (!user) {
      return res.status(401).json({
        error: {
          code: "LOGIN_INVALID",
          message: "Invalid email or password",
          status: 401,
        },
      });
    }

    const token = signUserToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.challenge = async (req, res, next) => {
  try {
    const payload = helpers.generateChallenge();
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { challengeId, signature } = req.body;
    if (!challengeId || !signature) {
      return res.status(400).json({
        error: {
          code: "VERIFY_FIELDS_REQUIRED",
          message: "challengeId and signature are required",
          status: 400,
        },
      });
    }

    const pendingChallenge = helpers.getStoredChallenge(challengeId);
    if (!pendingChallenge) {
      return res.status(400).json({
        error: {
          code: "CHALLENGE_MISSING",
          message: "Challenge not found or expired. Request a new one.",
          status: 400,
        },
      });
    }

    const recoveredWallet = helpers.recoverWalletFromSignature(
      signature,
      pendingChallenge.challenge,
    );
    if (!recoveredWallet) {
      return res.status(401).json({
        error: {
          code: "SIGNATURE_INVALID",
          message: "Signature verification failed",
          status: 401,
        },
      });
    }

    helpers.consumeChallenge(challengeId);

    const user = await User.findOrCreateByWallet(recoveredWallet);
    const token = signUserToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
      walletAddress: recoveredWallet,
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const profile = await User.getProfile(req.user.id);
    const settings = await User.getSettings(req.user.id);
    res.json({
      data: {
        profile,
        settings,
        access: {
          userId: req.user.id,
          walletAddress: req.user.wallet,
          email: req.user.email,
          authType: req.user.authType,
          isAdmin: req.user.isAdmin,
          isBanned: req.user.isBanned,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await User.getSettings(req.user.id);
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await User.updateSettings(req.user.id, req.body || {});
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await User.updateProfile(req.user.id, req.body || {});
    res.json({ data: profile });
  } catch (error) {
    next(error);
  }
};
