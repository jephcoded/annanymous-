/* global Buffer */

const crypto = require("crypto");

const normalizeWallet = (value) => value?.trim().toLowerCase() || "";
const normalizeEmail = (value) => value?.trim().toLowerCase() || "";
const ADMIN_PASSWORD_KEYLEN = 64;

const safeEquals = (left, right) => {
  const leftBuffer = Buffer.from(String(left ?? ""), "utf8");
  const rightBuffer = Buffer.from(String(right ?? ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hashPassword = (password) => {
  const normalized = String(password || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .scryptSync(normalized, salt, ADMIN_PASSWORD_KEYLEN)
    .toString("hex");
  return `${salt}:${derived}`;
};

const verifyPasswordHash = (password, storedHash) => {
  const normalized = String(password || "");
  const [salt, expectedHash] = String(storedHash || "").split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .scryptSync(normalized, salt, ADMIN_PASSWORD_KEYLEN)
    .toString("hex");
  return safeEquals(actualHash, expectedHash);
};

const getAdminWallets = () =>
  (process.env.ADMIN_WALLETS || "")
    .split(",")
    .map(normalizeWallet)
    .filter(Boolean);

const getAdminPanelCredentials = () => ({
  email: normalizeEmail(process.env.ADMIN_PANEL_EMAIL),
  password: String(process.env.ADMIN_PANEL_PASSWORD || ""),
});

const isAdminCredentialLoginEnabled = () => {
  const credentials = getAdminPanelCredentials();
  return Boolean(credentials.email && credentials.password);
};

const isAdminWallet = (walletAddress) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  if (!normalizedWallet) {
    return false;
  }

  return getAdminWallets().includes(normalizedWallet);
};

const isValidAdminCredential = ({ email, password }) => {
  const credentials = getAdminPanelCredentials();
  if (!credentials.email || !credentials.password) {
    return false;
  }

  return (
    normalizeEmail(email) === credentials.email &&
    safeEquals(password, credentials.password)
  );
};

module.exports = {
  getAdminWallets,
  getAdminPanelCredentials,
  isAdminCredentialLoginEnabled,
  isAdminWallet,
  isValidAdminCredential,
  hashPassword,
  normalizeEmail,
  normalizeWallet,
  verifyPasswordHash,
};
