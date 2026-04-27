const db = require("../config/db");

exports.listByPost = async (postId, cursor, limit = 30) => {
  const params = [postId];
  let query = `SELECT
    c.id,
    c.post_id AS "postId",
    c.user_id AS "userId",
    u.display_name AS "authorName",
    c.message,
    json_build_object(
      'contentCid', c.content_cid,
      'contentHash', c.content_hash,
      'chainId', c.chain_id,
      'contractAddress', c.contract_address,
      'transactionHash', c.transaction_hash,
      'syncStatus', c.sync_status
    ) AS decentralized,
    c.created_at AS "createdAt"
  FROM comments c
  LEFT JOIN users u ON u.id = c.user_id
  WHERE c.post_id = $1`;
  if (cursor) {
    params.push(cursor);
    query += ` AND id < $${params.length}`;
  }
  params.push(limit);
  query += ` ORDER BY id DESC LIMIT $${params.length}`;
  const result = await db.query(query, params);
  return result.rows;
};

exports.listRecent = async (limit = 30) => {
  const result = await db.query(
    `SELECT
       c.id,
       c.post_id AS "postId",
       c.user_id AS "userId",
       u.display_name AS "authorName",
       c.message,
       json_build_object(
         'contentCid', c.content_cid,
         'contentHash', c.content_hash,
         'chainId', c.chain_id,
         'contractAddress', c.contract_address,
         'transactionHash', c.transaction_hash,
         'syncStatus', c.sync_status
       ) AS decentralized,
       c.created_at AS "createdAt",
       LEFT(p.body, 72) AS "postPreview"
     FROM comments c
     INNER JOIN posts p ON p.id = c.post_id
     LEFT JOIN users u ON u.id = c.user_id
     WHERE p.deleted_at IS NULL
     ORDER BY c.id DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows;
};

exports.create = async ({ postId, message, userId, decentralized = {} }) => {
  const normalizedMessage = message?.trim();
  const normalizedMetadata = {
    contentCid: decentralized.contentCid || null,
    contentHash: decentralized.contentHash || null,
    chainId: decentralized.chainId || null,
    contractAddress: decentralized.contractAddress || null,
    transactionHash: decentralized.transactionHash || null,
    syncStatus:
      decentralized.syncStatus ||
      (decentralized.transactionHash ? "anchored" : "pending"),
  };
  if (!normalizedMessage) {
    const error = new Error("Comment message is required");
    error.status = 400;
    error.code = "COMMENT_REQUIRED";
    throw error;
  }

  const result = await db.query(
    `INSERT INTO comments (
       post_id,
       message,
       user_id,
       content_cid,
       content_hash,
       chain_id,
       contract_address,
       transaction_hash,
       sync_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING
       id,
       post_id AS "postId",
       user_id AS "userId",
       (SELECT display_name FROM users WHERE id = comments.user_id) AS "authorName",
       message,
       json_build_object(
         'contentCid', content_cid,
         'contentHash', content_hash,
         'chainId', chain_id,
         'contractAddress', contract_address,
         'transactionHash', transaction_hash,
         'syncStatus', sync_status
       ) AS decentralized,
       created_at AS "createdAt"`,
    [
      postId,
      normalizedMessage,
      userId,
      normalizedMetadata.contentCid,
      normalizedMetadata.contentHash,
      normalizedMetadata.chainId,
      normalizedMetadata.contractAddress,
      normalizedMetadata.transactionHash,
      normalizedMetadata.syncStatus,
    ],
  );
  return result.rows[0];
};
