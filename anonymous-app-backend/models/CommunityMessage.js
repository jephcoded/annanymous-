// CommunityMessage model for managing messages in communities
const db = require("../config/db");

exports.createMessage = async ({ communityId, userId, message }) => {
  const result = await db.query(
    `INSERT INTO community_messages (community_id, user_id, message)
     VALUES ($1, $2, $3)
     RETURNING
       id,
       community_id AS "communityId",
       user_id AS "userId",
       message,
       created_at AS "createdAt"`,
    [communityId, userId, message],
  );
  return result.rows[0];
};

exports.getMessages = async (communityId, limit = 50) => {
  const result = await db.query(
    `SELECT
       m.id,
       m.community_id AS "communityId",
       m.user_id AS "userId",
       m.message,
       m.created_at AS "createdAt",
       u.display_name AS sender
     FROM community_messages m
     LEFT JOIN users u ON m.user_id = u.id
     WHERE m.community_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [communityId, limit],
  );
  return result.rows.reverse(); // oldest first
};

exports.getMessageById = async (messageId) => {
  const result = await db.query(
    `SELECT id, community_id AS "communityId", user_id AS "userId", message, created_at AS "createdAt"
     FROM community_messages
     WHERE id = $1
     LIMIT 1`,
    [messageId],
  );
  return result.rows[0] || null;
};

exports.deleteMessage = async (messageId) => {
  await db.query("DELETE FROM community_messages WHERE id = $1", [
    messageId,
  ]);
};
