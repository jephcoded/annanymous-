// CommunityMessage model for managing messages in communities
const db = require("../config/db");

exports.createMessage = async ({ communityId, userId, message }) => {
  const result = await db.query(
    `INSERT INTO community_messages (community_id, user_id, message) VALUES ($1, $2, $3) RETURNING *`,
    [communityId, userId, message],
  );
  return result.rows[0];
};

exports.getMessages = async (communityId, limit = 50) => {
  const result = await db.query(
    `SELECT m.*, u.wallet_address as sender FROM community_messages m
     LEFT JOIN users u ON m.user_id = u.id
     WHERE m.community_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [communityId, limit],
  );
  return result.rows.reverse(); // oldest first
};
