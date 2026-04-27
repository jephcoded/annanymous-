const db = require("../config/db");

const sanitizeTag = (value) => value?.trim().toLowerCase() || null;

const sanitizeCategory = (value) => value?.trim().toLowerCase() || "general";

const deriveHashtags = (body = "") =>
  Array.from(
    new Set(
      [...body.matchAll(/#([a-z0-9_]+)/gi)].map((match) =>
        match[1].toLowerCase(),
      ),
    ),
  );

const buildListQuery = ({
  cursor,
  limit = 20,
  pollsOnly = false,
  postId,
  category,
  hashtag,
  campusTag,
  cityTag,
  contentMode,
  trending = false,
  userId,
}) => {
  const params = [];
  const currentUserIdExpression = userId ? `$${params.push(userId)}` : "NULL";
  let query = `SELECT
    p.id,
    p.body,
    p.media_url AS "mediaUrl",
    p.created_at AS "createdAt",
    p.user_id AS "userId",
    u.display_name AS "authorName",
    CASE
      WHEN ${currentUserIdExpression} IS NULL THEN FALSE
      ELSE p.user_id = ${currentUserIdExpression}
    END AS "isOwner",
    p.category,
    p.hashtags,
    p.content_mode AS "contentMode",
    p.expires_at AS "expiresAt",
    p.campus_tag AS "campusTag",
    p.city_tag AS "cityTag",
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
    uv.direction AS "userVote",
    COALESCE(c.comment_count, 0)::int AS "commentCount",
    COALESCE(po.poll_options, '[]'::json) AS "pollOptions",
    GREATEST(
      0,
      (
        COALESCE(v.upvotes, 0) * 3 +
        COALESCE(c.comment_count, 0) * 2 +
        COALESCE(json_array_length(po.poll_options), 0) * 2 -
        COALESCE(v.downvotes, 0)
      )
    )::int AS "trendingScore"
  FROM posts p
  LEFT JOIN (
    SELECT
      post_id,
      COUNT(*) FILTER (WHERE direction = 'up') AS upvotes,
      COUNT(*) FILTER (WHERE direction = 'down') AS downvotes
    FROM votes
    GROUP BY post_id
  ) v ON v.post_id = p.id
  LEFT JOIN votes uv ON uv.post_id = p.id AND uv.user_id = ${currentUserIdExpression}
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
  query += ` LEFT JOIN users u ON u.id = p.user_id`;

  const filters = [];
  filters.push("p.deleted_at IS NULL");
  filters.push("(p.expires_at IS NULL OR p.expires_at > NOW())");

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
  if (category) {
    params.push(category);
    filters.push(`p.category = $${params.length}`);
  }
  if (contentMode) {
    params.push(contentMode);
    filters.push(`p.content_mode = $${params.length}`);
  }
  if (hashtag) {
    params.push(hashtag);
    filters.push(`$${params.length} = ANY(p.hashtags)`);
  }
  if (campusTag) {
    params.push(campusTag);
    filters.push(`p.campus_tag = $${params.length}`);
  }
  if (cityTag) {
    params.push(cityTag);
    filters.push(`p.city_tag = $${params.length}`);
  }

  if (filters.length) {
    query += ` WHERE ${filters.join(" AND ")}`;
  }

  params.push(limit);
  query += trending
    ? ` ORDER BY "trendingScore" DESC, p.id DESC LIMIT $${params.length}`
    : ` ORDER BY p.id DESC LIMIT $${params.length}`;

  return { query, params };
};

exports.list = async ({
  cursor,
  limit = 20,
  pollsOnly = false,
  category,
  hashtag,
  campusTag,
  cityTag,
  contentMode,
  trending = false,
  userId = null,
}) => {
  const { query, params } = buildListQuery({
    cursor,
    limit,
    pollsOnly,
    category,
    hashtag,
    campusTag,
    cityTag,
    contentMode,
    trending,
    userId,
  });
  const result = await db.query(query, params);
  return result.rows;
};

exports.create = async ({
  body,
  mediaUrl,
  pollOptions,
  userId,
  category,
  contentMode,
  expiresAt,
  campusTag,
  cityTag,
  decentralized = {},
}) => {
  const normalizedBody = body?.trim() || "";
  const normalizedMediaUrl = mediaUrl?.trim() || null;
  const normalizedPollOptions = Array.isArray(pollOptions)
    ? pollOptions.map((option) => option?.trim()).filter(Boolean)
    : [];
  const normalizedCategory = sanitizeCategory(category);
  const normalizedContentMode = contentMode?.trim().toLowerCase() || "standard";
  const normalizedHashtags = deriveHashtags(normalizedBody);
  const normalizedCampusTag = sanitizeTag(campusTag);
  const normalizedCityTag = sanitizeTag(cityTag);
  const normalizedExpiresAt = expiresAt ? new Date(expiresAt) : null;
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

  if (!normalizedBody && !normalizedMediaUrl) {
    const error = new Error("Add a caption or an image before posting");
    error.status = 400;
    error.code = "POST_CONTENT_REQUIRED";
    throw error;
  }

  if (normalizedPollOptions.length === 1) {
    const error = new Error("A poll needs at least two options");
    error.status = 400;
    error.code = "POLL_OPTIONS_INVALID";
    throw error;
  }

  if (
    normalizedExpiresAt &&
    (Number.isNaN(normalizedExpiresAt.getTime()) ||
      normalizedExpiresAt.getTime() <= Date.now())
  ) {
    const error = new Error("Temporary post expiry must be in the future");
    error.status = 400;
    error.code = "POST_EXPIRY_INVALID";
    throw error;
  }

  const result = await db.query(
    `INSERT INTO posts (
      body,
      media_url,
      user_id,
      category,
      hashtags,
      content_mode,
      expires_at,
      campus_tag,
      city_tag,
      content_cid,
      content_hash,
      chain_id,
      contract_address,
      transaction_hash,
      sync_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      normalizedBody,
      normalizedMediaUrl,
      userId,
      normalizedCategory,
      normalizedHashtags,
      normalizedContentMode,
      normalizedExpiresAt ? normalizedExpiresAt.toISOString() : null,
      normalizedCampusTag,
      normalizedCityTag,
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
  return exports.findById(post.id, userId);
};

exports.findById = async (id, userId = null) => {
  const { query, params } = buildListQuery({ postId: id, limit: 1, userId });
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

exports.delete = async ({ postId, userId, reason = null }) => {
  const result = await db.query(
    `UPDATE posts
     SET deleted_at = NOW(),
         deleted_by = $2,
         delete_reason = $3
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
     RETURNING id`,
    [postId, userId, reason?.trim() || null],
  );

  if (result.rows.length) {
    return result.rows[0];
  }

  const existing = await db.query(
    `SELECT id, user_id AS "userId", deleted_at AS "deletedAt"
     FROM posts
     WHERE id = $1
     LIMIT 1`,
    [postId],
  );

  if (!existing.rows.length || existing.rows[0].deletedAt) {
    const error = new Error("Post does not exist");
    error.status = 404;
    error.code = "POST_NOT_FOUND";
    throw error;
  }

  if (existing.rows[0].userId !== userId) {
    const error = new Error("You can only delete your own posts");
    error.status = 403;
    error.code = "POST_DELETE_FORBIDDEN";
    throw error;
  }

  return { id: postId };
};

exports.flag = async (postId, reason, reporterUserId = null) => {
  await db.query(
    `INSERT INTO post_flags (post_id, reason, reporter_user_id)
     VALUES ($1, $2, $3)`,
    [postId, reason, reporterUserId],
  );
};
