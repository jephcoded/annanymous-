const jwt = require("jsonwebtoken");
const helpers = require("../utils/helpers");
const User = require("../models/User");

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
    const token = jwt.sign(
      { sub: user.id, wallet: recoveredWallet },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );
    res.json({ token, user, walletAddress: recoveredWallet });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const profile = await User.getProfile(req.user.id);
    const settings = await User.getSettings(req.user.id);
    res.json({ data: { profile, settings } });
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
