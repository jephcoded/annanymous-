const db = require("../config/db");

const MAX_RECENT_POSTS = 8;
const MAX_REPORTS = 8;
const MAX_BANNED_USERS = 8;
const MAX_ACTIVITY = 10;
const MAX_USER_RESULTS = 25;
const MAX_TREND_DAYS = 30;

const sanitizeLimit = (value, fallback, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
};

const logActivity = async ({ adminUserId, action, entityType, entityId, meta = {} }) => {
  await db.query(
    `INSERT INTO admin_activity_logs (admin_user_id, action, entity_type, entity_id, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [adminUserId, action, entityType, entityId ? String(entityId) : null, JSON.stringify(meta)],
  );
};

const getOverview = async ({ recentLimit, reportLimit, bannedLimit, activityLimit }) => {
  const [statsResult, postsResult, reportsResult, bannedResult, activityResult] =
    await Promise.all([
      db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM users) AS "totalUsers",
           (SELECT COUNT(*)::int FROM posts WHERE deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) AS "activePosts",
           (SELECT COUNT(*)::int FROM post_flags WHERE status = 'open') AS "reportedPosts",
           (SELECT COUNT(*)::int FROM users WHERE is_banned = TRUE) AS "bannedUsers"`,
      ),
      db.query(
        `SELECT
           p.id,
           p.body,
           p.created_at AS "createdAt",
           u.id AS "userId",
           u.wallet_address AS "walletAddress"
         FROM posts p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.deleted_at IS NULL
         ORDER BY p.id DESC
         LIMIT $1`,
        [sanitizeLimit(recentLimit, 5, MAX_RECENT_POSTS)],
      ),
      db.query(
        `SELECT
           pf.id,
           pf.post_id AS "postId",
           pf.reason,
           pf.status,
           pf.created_at AS "createdAt",
           p.body AS "postBody",
           reporter.wallet_address AS "reporterWallet",
           author.wallet_address AS "authorWallet"
         FROM post_flags pf
         INNER JOIN posts p ON p.id = pf.post_id
         LEFT JOIN users reporter ON reporter.id = pf.reporter_user_id
         LEFT JOIN users author ON author.id = p.user_id
         WHERE pf.status = 'open'
         ORDER BY pf.id DESC
         LIMIT $1`,
        [sanitizeLimit(reportLimit, 5, MAX_REPORTS)],
      ),
      db.query(
        `SELECT
           id,
           wallet_address AS "walletAddress",
           banned_reason AS "bannedReason",
           banned_at AS "bannedAt"
         FROM users
         WHERE is_banned = TRUE
         ORDER BY banned_at DESC NULLS LAST, id DESC
         LIMIT $1`,
        [sanitizeLimit(bannedLimit, 5, MAX_BANNED_USERS)],
      ),
      db.query(
        `SELECT
           aal.id,
           aal.action,
           aal.entity_type AS "entityType",
           aal.entity_id AS "entityId",
           aal.meta,
           aal.created_at AS "createdAt",
           u.wallet_address AS "adminWallet"
         FROM admin_activity_logs aal
         LEFT JOIN users u ON u.id = aal.admin_user_id
         ORDER BY aal.id DESC
         LIMIT $1`,
        [sanitizeLimit(activityLimit, 6, MAX_ACTIVITY)],
      ),
    ]);

  return {
    stats: statsResult.rows[0] || {
      totalUsers: 0,
      activePosts: 0,
      reportedPosts: 0,
      bannedUsers: 0,
    },
    recentPosts: postsResult.rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      userId: row.userId,
      walletAddress: row.walletAddress,
    })),
    reports: reportsResult.rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt,
      reporterWallet: row.reporterWallet,
      authorWallet: row.authorWallet,
      postPreview: row.postBody ? row.postBody.slice(0, 120) : "",
    })),
    bannedUsers: bannedResult.rows,
    activity: activityResult.rows,
  };
};

const getTrends = async ({ days }) => {
  const sanitizedDays = sanitizeLimit(days, 14, MAX_TREND_DAYS);

  const [seriesResult, categoryResult, trendingPostsResult] = await Promise.all([
    db.query(
      `WITH day_series AS (
         SELECT generate_series(
           date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day',
           date_trunc('day', NOW()),
           interval '1 day'
         )::date AS day
       )
       SELECT
         TO_CHAR(ds.day, 'YYYY-MM-DD') AS date,
         COALESCE(posts.count, 0)::int AS posts,
         COALESCE(users.count, 0)::int AS users,
         COALESCE(reports.count, 0)::int AS reports,
         COALESCE(comments.count, 0)::int AS comments,
         COALESCE(votes.count, 0)::int AS votes
       FROM day_series ds
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM posts
         WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         GROUP BY DATE(created_at)
       ) posts ON posts.day = ds.day
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM users
         WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         GROUP BY DATE(created_at)
       ) users ON users.day = ds.day
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM post_flags
         WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         GROUP BY DATE(created_at)
       ) reports ON reports.day = ds.day
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM comments
         WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         GROUP BY DATE(created_at)
       ) comments ON comments.day = ds.day
       LEFT JOIN (
         SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM votes
         WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         GROUP BY DATE(created_at)
       ) votes ON votes.day = ds.day
       ORDER BY ds.day ASC`,
      [sanitizedDays],
    ),
    db.query(
      `SELECT
         COALESCE(NULLIF(TRIM(category), ''), 'general') AS category,
         COUNT(*)::int AS count
       FROM posts
       WHERE created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         AND deleted_at IS NULL
       GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'general')
       ORDER BY count DESC, category ASC
       LIMIT 6`,
      [sanitizedDays],
    ),
    db.query(
      `SELECT
         p.id,
         p.body,
         p.category,
         p.created_at AS "createdAt",
         u.wallet_address AS "walletAddress",
         COALESCE(v.upvotes, 0)::int AS "upVotes",
         COALESCE(v.downvotes, 0)::int AS "downVotes",
         COALESCE(c.comment_count, 0)::int AS "commentCount",
         GREATEST(
           0,
           (
             COALESCE(v.upvotes, 0) * 3 +
             COALESCE(c.comment_count, 0) * 2 -
             COALESCE(v.downvotes, 0)
           )
         )::int AS "trendingScore"
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
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
       WHERE p.created_at >= date_trunc('day', NOW()) - ($1::int - 1) * interval '1 day'
         AND p.deleted_at IS NULL
       ORDER BY "trendingScore" DESC, p.id DESC
       LIMIT 5`,
      [sanitizedDays],
    ),
  ]);

  const series = seriesResult.rows;
  const totals = series.reduce(
    (accumulator, item) => ({
      posts: accumulator.posts + (item.posts || 0),
      users: accumulator.users + (item.users || 0),
      reports: accumulator.reports + (item.reports || 0),
      comments: accumulator.comments + (item.comments || 0),
      votes: accumulator.votes + (item.votes || 0),
    }),
    { posts: 0, users: 0, reports: 0, comments: 0, votes: 0 },
  );

  return {
    days: sanitizedDays,
    series,
    totals,
    categories: categoryResult.rows,
    trendingPosts: trendingPostsResult.rows.map((row) => ({
      id: row.id,
      body: row.body ? row.body.slice(0, 160) : "",
      category: row.category,
      createdAt: row.createdAt,
      walletAddress: row.walletAddress,
      upVotes: row.upVotes,
      downVotes: row.downVotes,
      commentCount: row.commentCount,
      trendingScore: row.trendingScore,
    })),
  };
};

const listUsers = async ({ query, limit }) => {
  const filters = [];
  const params = [];
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    params.push(`%${trimmedQuery.toLowerCase()}%`);
    filters.push(`(
      LOWER(u.wallet_address) LIKE $${params.length}
      OR LOWER(COALESCE(u.display_name, '')) LIKE $${params.length}
    )`);
  }

  params.push(sanitizeLimit(limit, 8, MAX_USER_RESULTS));

  let sql = `SELECT
      u.id,
      u.wallet_address AS "walletAddress",
      u.display_name AS "displayName",
      u.created_at AS "createdAt",
      u.is_banned AS "isBanned",
      u.banned_reason AS "bannedReason",
      u.banned_at AS "bannedAt",
      COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.user_id = u.id AND p.deleted_at IS NULL), 0) AS "postCount",
      COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id), 0) AS "commentCount"
    FROM users u`;

  if (filters.length) {
    sql += ` WHERE ${filters.join(" AND ")}`;
  }

  sql += ` ORDER BY u.id DESC LIMIT $${params.length}`;

  const result = await db.query(sql, params);
  return result.rows;
};

const getUserById = async (userId) => {
  const result = await db.query(
    `SELECT
       u.id,
       u.wallet_address AS "walletAddress",
       u.display_name AS "displayName",
       u.created_at AS "createdAt",
       u.is_banned AS "isBanned",
       u.banned_reason AS "bannedReason",
       u.banned_at AS "bannedAt",
       COALESCE((SELECT COUNT(*)::int FROM posts p WHERE p.user_id = u.id AND p.deleted_at IS NULL), 0) AS "postCount",
       COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id), 0) AS "commentCount",
       COALESCE((SELECT COUNT(*)::int FROM votes v WHERE v.user_id = u.id), 0) AS "voteCount"
     FROM users u
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
};

const banUser = async ({ targetUserId, adminUserId, reason }) => {
  const result = await db.query(
    `UPDATE users
     SET is_banned = TRUE,
         banned_at = NOW(),
         banned_reason = $2
     WHERE id = $1
     RETURNING id, wallet_address AS "walletAddress", is_banned AS "isBanned", banned_reason AS "bannedReason", banned_at AS "bannedAt"`,
    [targetUserId, reason?.trim() || "Banned by admin"],
  );

  const user = result.rows[0] || null;
  if (user) {
    await logActivity({
      adminUserId,
      action: "ban_user",
      entityType: "user",
      entityId: user.id,
      meta: { reason: user.bannedReason, walletAddress: user.walletAddress },
    });
  }

  return user;
};

const unbanUser = async ({ targetUserId, adminUserId }) => {
  const result = await db.query(
    `UPDATE users
     SET is_banned = FALSE,
         banned_at = NULL,
         banned_reason = NULL
     WHERE id = $1
     RETURNING id, wallet_address AS "walletAddress", is_banned AS "isBanned"`,
    [targetUserId],
  );

  const user = result.rows[0] || null;
  if (user) {
    await logActivity({
      adminUserId,
      action: "unban_user",
      entityType: "user",
      entityId: user.id,
      meta: { walletAddress: user.walletAddress },
    });
  }

  return user;
};

const deletePost = async ({ postId, adminUserId, reason }) => {
  const result = await db.query(
    `UPDATE posts
     SET deleted_at = NOW(),
         deleted_by = $2,
         delete_reason = $3
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, body, user_id AS "userId", delete_reason AS "deleteReason", deleted_at AS "deletedAt"`,
    [postId, adminUserId, reason?.trim() || "Removed by admin"],
  );

  const post = result.rows[0] || null;
  if (post) {
    await logActivity({
      adminUserId,
      action: "delete_post",
      entityType: "post",
      entityId: post.id,
      meta: { reason: post.deleteReason },
    });
  }

  return post;
};

const deleteAllPosts = async ({ adminUserId, reason }) => {
  const result = await db.query(
    `UPDATE posts
     SET deleted_at = NOW(),
         deleted_by = $1,
         delete_reason = $2
     WHERE deleted_at IS NULL
     RETURNING id`,
    [adminUserId, reason?.trim() || "Cleared by admin"],
  );

  await logActivity({
    adminUserId,
    action: "delete_all_posts",
    entityType: "post",
    entityId: null,
    meta: { deletedCount: result.rowCount, reason: reason?.trim() || "Cleared by admin" },
  });

  return {
    deletedCount: result.rowCount,
  };
};

const resolveReport = async ({ reportId, adminUserId, resolutionNote }) => {
  const result = await db.query(
    `UPDATE post_flags
     SET status = 'resolved',
         reviewed_by = $2,
         reviewed_at = NOW(),
         resolution_note = $3
     WHERE id = $1 AND status = 'open'
     RETURNING id, post_id AS "postId", status, resolution_note AS "resolutionNote", reviewed_at AS "reviewedAt"`,
    [reportId, adminUserId, resolutionNote?.trim() || "Resolved by admin"],
  );

  const report = result.rows[0] || null;
  if (report) {
    await logActivity({
      adminUserId,
      action: "resolve_report",
      entityType: "report",
      entityId: report.id,
      meta: { postId: report.postId, resolutionNote: report.resolutionNote },
    });
  }

  return report;
};

module.exports = {
  deletePost,
  deleteAllPosts,
  getOverview,
  getTrends,
  getUserById,
  listUsers,
  logActivity,
  banUser,
  unbanUser,
  resolveReport,
};