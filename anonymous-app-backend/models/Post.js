const db = require("../config/db");

const buildListQuery = ({ cursor, limit = 20, pollsOnly = false, postId }) => {
  const params = [];
  let query = `SELECT
    p.id,
    p.body,
    p.media_url AS "mediaUrl",
    p.created_at AS "createdAt",
    p.user_id AS "userId",
    json_build_object(
      'contentCid', p.content_cid,
      'contentHash', p.content_hash,
      'chainId', p.chain_id,
      'contractAddress', p.contract_address,
      'transactionHash', p.transaction_hash,
      'syncStatus', p.sync_status
    ) AS decentralized,
    COALESCE(v.upvotes, 0)::int AS "upVotes",
    COALESCE(v.downvotes, 0)::int AS "downVotes",
    COALESCE(c.comment_count, 0)::int AS "commentCount",
    COALESCE(po.poll_options, '[]'::json) AS "pollOptions"
  FROM posts p
  LEFT JOIN (
    SELECT
      post_id,
      COUNT(*) FILTER (WHERE direction = 'up') AS upvotes,
      COUNT(*) FILTER (WHERE direction = 'down') AS downvotes
    FROM votes
    GROUP BY post_id
  ) v ON v.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count
    FROM comments
    GROUP BY post_id
  ) c ON c.post_id = p.id
  LEFT JOIN (
    SELECT
      po.post_id,
      json_agg(
        json_build_object(
          'id', po.id,
          'label', po.label,
          'votes', COALESCE(pv.vote_count, 0)
        )
        ORDER BY po.id
      ) AS poll_options
    FROM poll_options po
    LEFT JOIN (
      SELECT option_id, COUNT(*)::int AS vote_count
      FROM poll_votes
      GROUP BY option_id
    ) pv ON pv.option_id = po.id
    GROUP BY po.post_id
  ) po ON po.post_id = p.id`;

  const filters = [];
  if (postId) {
    params.push(postId);
    filters.push(`p.id = $${params.length}`);
  }
  if (cursor) {
    params.push(cursor);
    filters.push(`p.id < $${params.length}`);
  }
  if (pollsOnly) {
    filters.push("po.poll_options IS NOT NULL");
  }

  if (filters.length) {
    query += ` WHERE ${filters.join(" AND ")}`;
  }

  params.push(limit);
  query += ` ORDER BY p.id DESC LIMIT $${params.length}`;

  return { query, params };
};

exports.list = async ({ cursor, limit = 20, pollsOnly = false }) => {
  const { query, params } = buildListQuery({ cursor, limit, pollsOnly });
  const result = await db.query(query, params);
  return result.rows;
};

exports.create = async ({ body, mediaUrl, pollOptions, userId, decentralized = {} }) => {
  const normalizedBody = body?.trim();
  const normalizedPollOptions = Array.isArray(pollOptions)
    ? pollOptions.map((option) => option?.trim()).filter(Boolean)
    : [];
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

  if (!normalizedBody) {
    const error = new Error("Post body is required");
    error.status = 400;
    error.code = "POST_BODY_REQUIRED";
    throw error;
  }

  if (normalizedPollOptions.length === 1) {
    const error = new Error("A poll needs at least two options");
    error.status = 400;
    error.code = "POLL_OPTIONS_INVALID";
    throw error;
  }

  const result = await db.query(
    `INSERT INTO posts (
      body,
      media_url,
      user_id,
      content_cid,
      content_hash,
      chain_id,
      contract_address,
      transaction_hash,
      sync_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      normalizedBody,
      mediaUrl,
      userId,
      normalizedMetadata.contentCid,
      normalizedMetadata.contentHash,
      normalizedMetadata.chainId,
      normalizedMetadata.contractAddress,
      normalizedMetadata.transactionHash,
      normalizedMetadata.syncStatus,
    ],
  );
  const post = result.rows[0];
  if (normalizedPollOptions.length) {
    await Promise.all(
      normalizedPollOptions.map((option) =>
        db.query("INSERT INTO poll_options (post_id, label) VALUES ($1, $2)", [
          post.id,
          option,
        ]),
      ),
    );
  }
  return exports.findById(post.id);
};

exports.findById = async (id) => {
  const { query, params } = buildListQuery({ postId: id, limit: 1 });
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.flag = async (postId, reason) => {
  await db.query("INSERT INTO post_flags (post_id, reason) VALUES ($1, $2)", [
    postId,
    reason,
  ]);
};
