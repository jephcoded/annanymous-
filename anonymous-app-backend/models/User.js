const db = require("../config/db");

let settingsSchemaReady = false;
let pushTokenSchemaReady = false;

const ensureSettingsSchema = async () => {
  if (settingsSchemaReady) {
    return;
  }

  await db.query(
    "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS direct_messages_enabled BOOLEAN NOT NULL DEFAULT FALSE",
  );

  settingsSchemaReady = true;
};

const ensurePushTokenSchema = async () => {
  if (pushTokenSchemaReady) {
    return;
  }

  await db.query(
    `CREATE TABLE IF NOT EXISTS user_push_tokens (
       id BIGSERIAL PRIMARY KEY,
       user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       expo_push_token TEXT NOT NULL UNIQUE,
       platform TEXT,
       disabled_at TIMESTAMPTZ,
       last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id, disabled_at, last_seen_at DESC)",
  );

  pushTokenSchemaReady = true;
};
const {
  hashPassword,
  isAdminWallet,
  normalizeEmail,
  verifyPasswordHash,
} = require("../utils/admin");

exports.findOrCreateByWallet = async (walletAddress) => {
  const existing = await db.query(
    "SELECT * FROM users WHERE wallet_address = $1 LIMIT 1",
    [walletAddress],
  );
  if (existing.rows.length) return existing.rows[0];
  const inserted = await db.query(
    "INSERT INTO users (wallet_address, auth_type) VALUES ($1, 'wallet') RETURNING *",
    [walletAddress],
  );
  return inserted.rows[0];
};

exports.createPasswordUser = async ({ email, password, displayName, bio }) => {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, display_name, bio, auth_type)
     VALUES ($1, $2, $3, $4, 'password')
     RETURNING *`,
    [
      normalizedEmail,
      passwordHash,
      displayName?.trim() || null,
      bio?.trim() || null,
    ],
  );

  return result.rows[0];
};

exports.findByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const result = await db.query(
    `SELECT *
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] || null;
};

exports.authenticatePasswordUser = async ({ email, password }) => {
  const user = await exports.findByEmail(email);
  if (!user || user.auth_type !== "password") {
    return null;
  }

  if (!verifyPasswordHash(password, user.password_hash)) {
    return null;
  }

  return user;
};

exports.getAccessContext = async (userId) => {
  const result = await db.query(
    `SELECT
       id,
       wallet_address AS "walletAddress",
        email,
        auth_type AS "authType",
       is_banned AS "isBanned",
       banned_reason AS "bannedReason",
       banned_at AS "bannedAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const user = result.rows[0] || null;
  if (!user) {
    return null;
  }

  return {
    ...user,
    isAdmin: isAdminWallet(user.walletAddress),
  };
};

exports.getProfile = async (userId) => {
  const result = await db.query(
    `SELECT
       u.id,
       u.wallet_address AS "walletAddress",
      u.email,
       u.display_name AS "displayName",
      u.bio,
      u.auth_type AS "authType",
       u.created_at AS "createdAt",
       COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.user_id = u.id), 0) AS "postCount",
       COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id), 0) AS "commentCount",
       COALESCE((SELECT COUNT(*)::int FROM votes v WHERE v.user_id = u.id), 0) AS "voteCount",
       COALESCE((SELECT COUNT(*)::int FROM notifications n WHERE n.user_id = u.id AND n.is_read = FALSE), 0) AS "unreadCount"
     FROM users u
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
};

exports.updateProfile = async (userId, profile) => {
  const result = await db.query(
    `UPDATE users
     SET display_name = COALESCE($2, display_name),
         bio = COALESCE($3, bio)
     WHERE id = $1
     RETURNING id`,
    [
      userId,
      typeof profile.displayName === "string"
        ? profile.displayName.trim() || null
        : null,
      typeof profile.bio === "string" ? profile.bio.trim() || null : null,
    ],
  );

  if (!result.rows.length) {
    return null;
  }

  return exports.getProfile(userId);
};

exports.getSettings = async (userId) => {
  await ensureSettingsSchema();

  await db.query(
    "INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [userId],
  );

  const result = await db.query(
    `SELECT
       user_id AS "userId",
       push_enabled AS "pushEnabled",
       email_enabled AS "emailEnabled",
       marketing_enabled AS "marketingEnabled",
       show_wallet_summary AS "showWalletSummary",
       direct_messages_enabled AS "directMessagesEnabled",
       muted_keywords AS "mutedKeywords",
       theme,
       updated_at AS "updatedAt"
     FROM user_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
};

exports.updateSettings = async (userId, settings) => {
  await ensureSettingsSchema();

  const current = (await exports.getSettings(userId)) || {};
  const nextSettings = {
    pushEnabled:
      typeof settings.pushEnabled === "boolean"
        ? settings.pushEnabled
        : current.pushEnabled,
    emailEnabled:
      typeof settings.emailEnabled === "boolean"
        ? settings.emailEnabled
        : current.emailEnabled,
    marketingEnabled:
      typeof settings.marketingEnabled === "boolean"
        ? settings.marketingEnabled
        : current.marketingEnabled,
    showWalletSummary:
      typeof settings.showWalletSummary === "boolean"
        ? settings.showWalletSummary
        : current.showWalletSummary,
    directMessagesEnabled:
      typeof settings.directMessagesEnabled === "boolean"
        ? settings.directMessagesEnabled
        : current.directMessagesEnabled,
    mutedKeywords: Array.isArray(settings.mutedKeywords)
      ? settings.mutedKeywords.filter(Boolean)
      : current.mutedKeywords || [],
    theme:
      typeof settings.theme === "string" && settings.theme.trim()
        ? settings.theme.trim()
        : current.theme || "dark",
  };

  const result = await db.query(
    `INSERT INTO user_settings (
       user_id,
       push_enabled,
       email_enabled,
       marketing_enabled,
       show_wallet_summary,
       direct_messages_enabled,
       muted_keywords,
       theme,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       push_enabled = EXCLUDED.push_enabled,
       email_enabled = EXCLUDED.email_enabled,
       marketing_enabled = EXCLUDED.marketing_enabled,
       show_wallet_summary = EXCLUDED.show_wallet_summary,
       direct_messages_enabled = EXCLUDED.direct_messages_enabled,
       muted_keywords = EXCLUDED.muted_keywords,
       theme = EXCLUDED.theme,
       updated_at = NOW()
     RETURNING
       user_id AS "userId",
       push_enabled AS "pushEnabled",
       email_enabled AS "emailEnabled",
       marketing_enabled AS "marketingEnabled",
       show_wallet_summary AS "showWalletSummary",
       direct_messages_enabled AS "directMessagesEnabled",
       muted_keywords AS "mutedKeywords",
       theme,
       updated_at AS "updatedAt"`,
    [
      userId,
      nextSettings.pushEnabled,
      nextSettings.emailEnabled,
      nextSettings.marketingEnabled,
      nextSettings.showWalletSummary,
      nextSettings.directMessagesEnabled,
      nextSettings.mutedKeywords,
      nextSettings.theme,
    ],
  );

  return result.rows[0];
};

exports.registerPushToken = async ({ userId, pushToken, platform }) => {
  await ensureSettingsSchema();
  await ensurePushTokenSchema();

  await db.query(
    "INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
    [userId],
  );

  const result = await db.query(
    `INSERT INTO user_push_tokens (
       user_id,
       expo_push_token,
       platform,
       disabled_at,
       last_seen_at
     ) VALUES ($1, $2, $3, NULL, NOW())
     ON CONFLICT (expo_push_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       platform = EXCLUDED.platform,
       disabled_at = NULL,
       last_seen_at = NOW()
     RETURNING
       id,
       user_id AS "userId",
       expo_push_token AS "pushToken",
       platform,
       disabled_at AS "disabledAt",
       last_seen_at AS "lastSeenAt"`,
    [userId, pushToken, platform || null],
  );

  return result.rows[0] || null;
};

exports.ensurePushTokenSchema = ensurePushTokenSchema;
