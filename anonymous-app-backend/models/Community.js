// Community model for managing communities, members, and invites
const db = require("../config/db");

exports.listForUser = async (userId) => {
  const result = await db.query(
    `SELECT
       c.id,
       c.name,
       c.description,
       c.is_private AS "isPrivate",
       c.invite_code AS "inviteCode",
       c.created_at AS "createdAt",
       COALESCE(cm_self.is_admin, false) AS "isAdmin",
       cm_self.status AS status,
       COUNT(cm_active.id)::int AS "memberCount"
     FROM communities c
     LEFT JOIN community_members cm_self
       ON cm_self.community_id = c.id
      AND cm_self.user_id = $1
     LEFT JOIN community_members cm_active
       ON cm_active.community_id = c.id
      AND cm_active.status = 'active'
     GROUP BY c.id, cm_self.is_admin, cm_self.status
     ORDER BY COUNT(cm_active.id) DESC, c.created_at DESC`,
    [userId],
  );

  return result.rows;
};

exports.getById = async (communityId) => {
  const result = await db.query(
    `SELECT
       id,
       name,
       description,
       is_private AS "isPrivate",
       invite_code AS "inviteCode",
       created_at AS "createdAt"
     FROM communities
     WHERE id = $1
     LIMIT 1`,
    [communityId],
  );

  return result.rows[0] || null;
};

exports.createCommunity = async ({
  name,
  description,
  createdBy,
  inviteCode,
}) => {
  const result = await db.query(
    `INSERT INTO communities (name, description, created_by, invite_code)
     VALUES ($1, $2, $3, $4)
     RETURNING
       id,
       name,
       description,
       invite_code AS "inviteCode",
       created_at AS "createdAt"`,
    [name, description, createdBy, inviteCode],
  );
  return result.rows[0];
};

exports.findMembership = async (communityId, userId) => {
  const result = await db.query(
    `SELECT * FROM community_members WHERE community_id = $1 AND user_id = $2 LIMIT 1`,
    [communityId, userId],
  );
  return result.rows[0] || null;
};

exports.addMember = async ({
  communityId,
  userId,
  isAdmin = false,
  status = "pending",
}) => {
  const result = await db.query(
    `INSERT INTO community_members (community_id, user_id, is_admin, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [communityId, userId, isAdmin, status],
  );
  return result.rows[0];
};

exports.updateMembership = async (membershipId, updates) => {
  const result = await db.query(
    `UPDATE community_members
     SET
       status = COALESCE($2, status),
       is_admin = COALESCE($3, is_admin)
     WHERE id = $1
     RETURNING
       id,
       community_id AS "communityId",
       user_id AS "userId",
       is_admin AS "isAdmin",
       status,
       joined_at AS "joinedAt"`,
    [
      membershipId,
      updates.status ?? null,
      typeof updates.isAdmin === "boolean" ? updates.isAdmin : null,
    ],
  );

  return result.rows[0] || null;
};

exports.createInvite = async ({
  communityId,
  createdBy,
  inviteCode,
  expiresAt,
}) => {
  const result = await db.query(
    `INSERT INTO community_invites (community_id, invite_code, created_by, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING
       id,
       community_id AS "communityId",
       invite_code AS "inviteCode",
       created_at AS "createdAt",
       expires_at AS "expiresAt",
       is_active AS "isActive"`,
    [communityId, inviteCode, createdBy, expiresAt || null],
  );
  return result.rows[0];
};

exports.getCommunityByInvite = async (inviteCode) => {
  const inviteResult = await db.query(
    `SELECT
       c.id,
       c.name,
       c.description,
       c.invite_code AS "inviteCode",
       c.created_at AS "createdAt"
     FROM community_invites ci
     INNER JOIN communities c ON c.id = ci.community_id
     WHERE ci.invite_code = $1
       AND ci.is_active = TRUE
       AND (ci.expires_at IS NULL OR ci.expires_at > NOW())
     LIMIT 1`,
    [inviteCode],
  );

  if (inviteResult.rows[0]) {
    return inviteResult.rows[0];
  }

  const communityResult = await db.query(
    `SELECT
       id,
       name,
       description,
       invite_code AS "inviteCode",
       created_at AS "createdAt"
     FROM communities
     WHERE invite_code = $1
     LIMIT 1`,
    [inviteCode],
  );

  return communityResult.rows[0] || null;
};

exports.getMembers = async (communityId) => {
  const result = await db.query(
    `SELECT * FROM community_members WHERE community_id = $1 AND status = 'active'`,
    [communityId],
  );
  return result.rows;
};

exports.listMembersWithDetails = async (communityId) => {
  const result = await db.query(
    `SELECT
       cm.id,
       cm.user_id AS "userId",
       cm.is_admin AS "isAdmin",
       cm.status,
       cm.joined_at AS "joinedAt",
       u.display_name AS "displayName"
     FROM community_members cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.community_id = $1 AND cm.status != 'removed'
     ORDER BY (cm.status = 'pending') DESC, cm.joined_at ASC`,
    [communityId],
  );
  return result.rows;
};

exports.isAdmin = async (communityId, userId) => {
  const result = await db.query(
    `SELECT is_admin
     FROM community_members
     WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
    [communityId, userId],
  );
  return result.rows[0]?.is_admin || false;
};

exports.isActiveMember = async (communityId, userId) => {
  const result = await db.query(
    `SELECT 1
     FROM community_members
     WHERE community_id = $1 AND user_id = $2 AND status = 'active'`,
    [communityId, userId],
  );
  return result.rowCount > 0;
};
