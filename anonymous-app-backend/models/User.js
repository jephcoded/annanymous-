const db = require("../config/db");

exports.findOrCreateByWallet = async (walletAddress) => {
  const existing = await db.query(
    "SELECT * FROM users WHERE wallet_address = $1 LIMIT 1",
    [walletAddress],
  );
  if (existing.rows.length) return existing.rows[0];
  const inserted = await db.query(
    "INSERT INTO users (wallet_address) VALUES ($1) RETURNING *",
    [walletAddress],
  );
  return inserted.rows[0];
};

exports.getProfile = async (userId) => {
  const result = await db.query(
    `SELECT
       u.id,
       u.wallet_address AS "walletAddress",
       u.display_name AS "displayName",
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

exports.getSettings = async (userId) => {
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
       muted_keywords,
       theme,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       push_enabled = EXCLUDED.push_enabled,
       email_enabled = EXCLUDED.email_enabled,
       marketing_enabled = EXCLUDED.marketing_enabled,
       show_wallet_summary = EXCLUDED.show_wallet_summary,
       muted_keywords = EXCLUDED.muted_keywords,
       theme = EXCLUDED.theme,
       updated_at = NOW()
     RETURNING
       user_id AS "userId",
       push_enabled AS "pushEnabled",
       email_enabled AS "emailEnabled",
       marketing_enabled AS "marketingEnabled",
       show_wallet_summary AS "showWalletSummary",
       muted_keywords AS "mutedKeywords",
       theme,
       updated_at AS "updatedAt"`,
    [
      userId,
      nextSettings.pushEnabled,
      nextSettings.emailEnabled,
      nextSettings.marketingEnabled,
      nextSettings.showWalletSummary,
      nextSettings.mutedKeywords,
      nextSettings.theme,
    ],
  );

  return result.rows[0];
};
