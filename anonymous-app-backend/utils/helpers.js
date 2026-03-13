const crypto = require("crypto");
const { ethers } = require("ethers");

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challengeStore = new Map();

const normalizeWallet = (walletAddress) => {
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return null;
  }

  return ethers.getAddress(walletAddress);
};

const buildChallengeMessage = (challengeId, nonce) =>
  [
    "Welcome to Ananymous.",
    "",
    "Sign this message to prove you own this wallet and continue anonymously.",
    `Challenge ID: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");

exports.generateChallenge = () => {
  const challengeId = crypto.randomBytes(12).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const challenge = buildChallengeMessage(challengeId, nonce);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

  challengeStore.set(challengeId, {
    challenge,
    expiresAt,
  });

  return { challengeId, challenge, expiresAt };
};

exports.challengeExpiry = () =>
  new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

exports.getStoredChallenge = (challengeId) => {
  if (!challengeId) {
    return null;
  }

  const entry = challengeStore.get(challengeId);
  if (!entry) {
    return null;
  }

  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    challengeStore.delete(challengeId);
    return null;
  }

  return { ...entry, challengeId };
};

exports.consumeChallenge = (challengeId) => {
  if (!challengeId) {
    return;
  }

  challengeStore.delete(challengeId);
};

exports.verifySignature = (walletAddress, signature, challenge) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet || !signature || !challenge) {
    return false;
  }

  try {
    const recoveredWallet = ethers.verifyMessage(challenge, signature);
    return normalizeWallet(recoveredWallet) === normalizedWallet;
  } catch (_error) {
    return false;
  }
};

exports.recoverWalletFromSignature = (signature, challenge) => {
  if (!signature || !challenge) {
    return null;
  }

  try {
    const recoveredWallet = ethers.verifyMessage(challenge, signature);
    return normalizeWallet(recoveredWallet);
  } catch (_error) {
    return null;
  }
};

exports.normalizeWallet = normalizeWallet;

exports.randomId = (prefix = "id") =>
  `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
