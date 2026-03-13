const jwt = require("jsonwebtoken");
const helpers = require("../utils/helpers");
const User = require("../models/User");

exports.challenge = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({
        error: {
          code: "WALLET_REQUIRED",
          message: "walletAddress is required",
          status: 400,
        },
      });
    }

    const payload = helpers.generateChallenge(walletAddress);
    res.json(payload);
  } catch (error) {
    if (error.message === "Wallet address is invalid") {
      return res.status(400).json({
        error: {
          code: "WALLET_INVALID",
          message: "Wallet address is invalid",
          status: 400,
        },
      });
    }

    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { walletAddress, signature } = req.body;
    if (!walletAddress || !signature) {
      return res.status(400).json({
        error: {
          code: "VERIFY_FIELDS_REQUIRED",
          message: "walletAddress and signature are required",
          status: 400,
        },
      });
    }

    const pendingChallenge = helpers.getStoredChallenge(walletAddress);
    if (!pendingChallenge) {
      return res.status(400).json({
        error: {
          code: "CHALLENGE_MISSING",
          message: "Challenge not found or expired. Request a new one.",
          status: 400,
        },
      });
    }

    const isValid = helpers.verifySignature(
      pendingChallenge.walletAddress,
      signature,
      pendingChallenge.challenge,
    );
    if (!isValid) {
      return res.status(401).json({
        error: {
          code: "SIGNATURE_INVALID",
          message: "Signature verification failed",
          status: 401,
        },
      });
    }

    helpers.consumeChallenge(pendingChallenge.walletAddress);

    const user = await User.findOrCreateByWallet(
      pendingChallenge.walletAddress,
    );
    const token = jwt.sign(
      { sub: user.id, wallet: pendingChallenge.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );
    res.json({ token, user, walletAddress: pendingChallenge.walletAddress });
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
