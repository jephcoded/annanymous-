const db = require("../config/db");

exports.create = async ({ userId, type, title, body, meta = {} }) => {
  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, meta)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id,
       user_id AS "userId",
       type,
       title,
       body,
       meta,
       is_read AS "isRead",
       created_at AS "createdAt"`,
    [userId, type, title, body, meta],
  );

  return result.rows[0];
};

exports.listByUser = async (userId, limit = 30) => {
  const result = await db.query(
    `SELECT
       id,
       user_id AS "userId",
       type,
       title,
       body,
       meta,
       is_read AS "isRead",
       created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows;
};

exports.markRead = async (userId, notificationId) => {
  const result = await db.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING
       id,
       user_id AS "userId",
       type,
       title,
       body,
       meta,
       is_read AS "isRead",
       created_at AS "createdAt"`,
    [notificationId, userId],
  );

  return result.rows[0] || null;
};

exports.markAllRead = async (userId) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    [userId],
  );
};
