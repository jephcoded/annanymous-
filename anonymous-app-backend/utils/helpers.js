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

const buildChallengeMessage = (walletAddress, nonce) => {
  return [
    "Welcome to Ananymous.",
    "",
    "Sign this message to prove you own this wallet and continue anonymously.",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
};

exports.generateChallenge = (walletAddress) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet) {
    throw new Error("Wallet address is invalid");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const challenge = buildChallengeMessage(normalizedWallet, nonce);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

  challengeStore.set(normalizedWallet, {
    challenge,
    expiresAt,
  });

  return { challenge, expiresAt, walletAddress: normalizedWallet };
};

exports.challengeExpiry = () =>
  new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

exports.getStoredChallenge = (walletAddress) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet) {
    return null;
  }

  const entry = challengeStore.get(normalizedWallet);
  if (!entry) {
    return null;
  }

  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    challengeStore.delete(normalizedWallet);
    return null;
  }

  return { ...entry, walletAddress: normalizedWallet };
};

exports.consumeChallenge = (walletAddress) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet) {
    return;
  }

  challengeStore.delete(normalizedWallet);
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

exports.normalizeWallet = normalizeWallet;

exports.randomId = (prefix = "id") =>
  `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
