const db = require("../config/db");
const { hashPassword, normalizeEmail, verifyPasswordHash } = require("../utils/admin");

const mapMember = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
    createdByMemberId: row.createdByMemberId,
    createdByEmail: row.createdByEmail,
  };
};

const baseSelect = `SELECT
  am.id,
  am.email,
  am.role,
  am.is_active AS "isActive",
  am.created_at AS "createdAt",
  am.updated_at AS "updatedAt",
  am.last_login_at AS "lastLoginAt",
  am.created_by_member_id AS "createdByMemberId",
  creator.email AS "createdByEmail"
FROM admin_members am
LEFT JOIN admin_members creator ON creator.id = am.created_by_member_id`;

const findByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const result = await db.query(
    `${baseSelect}
     WHERE am.email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return mapMember(result.rows[0]);
};

const findForLoginByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const result = await db.query(
    `SELECT
       id,
       email,
       password_hash AS "passwordHash",
       role,
       is_active AS "isActive"
     FROM admin_members
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] || null;
};

const findById = async (memberId) => {
  const result = await db.query(
    `${baseSelect}
     WHERE am.id = $1
     LIMIT 1`,
    [memberId],
  );

  return mapMember(result.rows[0]);
};

const listMembers = async () => {
  const result = await db.query(
    `${baseSelect}
     ORDER BY am.role = 'owner' DESC, am.is_active DESC, am.created_at DESC`,
  );

  return result.rows.map(mapMember);
};

const createMember = async ({ email, password, role, createdByMemberId = null }) => {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const nextRole = role === "owner" ? "owner" : "admin";
  const result = await db.query(
    `INSERT INTO admin_members (
       email,
       password_hash,
       role,
       is_active,
       created_by_member_id,
       updated_at
     )
     VALUES ($1, $2, $3, TRUE, $4, NOW())
     RETURNING id`,
    [normalizedEmail, passwordHash, nextRole, createdByMemberId],
  );

  return findById(result.rows[0].id);
};

const updatePassword = async ({ memberId, password }) => {
  const passwordHash = hashPassword(password);
  const result = await db.query(
    `UPDATE admin_members
     SET password_hash = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [memberId, passwordHash],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const setActiveState = async ({ memberId, isActive }) => {
  const result = await db.query(
    `UPDATE admin_members
     SET is_active = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [memberId, isActive],
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const countActiveOwners = async () => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM admin_members
     WHERE is_active = TRUE AND role = 'owner'`,
  );

  return result.rows[0]?.count || 0;
};

const touchLastLogin = async (memberId) => {
  await db.query(
    `UPDATE admin_members
     SET last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [memberId],
  );
};

const authenticateMember = async ({ email, password }) => {
  const member = await findForLoginByEmail(email);
  if (!member || !member.isActive) {
    return null;
  }

  if (!verifyPasswordHash(password, member.passwordHash)) {
    return null;
  }

  await touchLastLogin(member.id);
  return findById(member.id);
};

module.exports = {
  authenticateMember,
  countActiveOwners,
  createMember,
  findByEmail,
  findById,
  listMembers,
  setActiveState,
  updatePassword,
};