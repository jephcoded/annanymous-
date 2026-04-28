-- Core user record keyed by wallet
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  email TEXT,
  password_hash TEXT,
  display_name TEXT,
  bio TEXT,
  auth_type TEXT NOT NULL DEFAULT 'wallet',
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  banned_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type TEXT NOT NULL DEFAULT 'wallet';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_type_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_auth_type_check CHECK (auth_type IN ('wallet', 'password'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL;

-- Communities: private groups for anonymous users
CREATE TABLE IF NOT EXISTS communities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invite_code TEXT UNIQUE NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT TRUE
);

-- Community membership: tracks which users belong to which communities
CREATE TABLE IF NOT EXISTS community_members (
  id BIGSERIAL PRIMARY KEY,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'active', 'removed'
);

-- Community invites: tracks invite links and their status
CREATE TABLE IF NOT EXISTS community_invites (
  id BIGSERIAL PRIMARY KEY,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Community chat messages
CREATE TABLE IF NOT EXISTS community_messages (
  id BIGSERIAL PRIMARY KEY,
  community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posts include optional media and are linked to the authoring wallet
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  content_mode TEXT NOT NULL DEFAULT 'standard',
  expires_at TIMESTAMPTZ,
  campus_tag TEXT,
  city_tag TEXT,
  content_cid TEXT,
  content_hash TEXT,
  chain_id INTEGER,
  contract_address TEXT,
  transaction_hash TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  deleted_at TIMESTAMPTZ,
  deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  delete_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_cid TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS campus_tag TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS city_tag TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- Poll options belong to a post that has poll metadata on the frontend
CREATE TABLE IF NOT EXISTS poll_options (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments reference both the post and the wallet that authored them
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  content_cid TEXT,
  content_hash TEXT,
  chain_id INTEGER,
  contract_address TEXT,
  transaction_hash TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS content_cid TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending';

-- Post vote aggregates rely on a unique wallet/post constraint
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('up','down')),
  chain_id INTEGER,
  contract_address TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE votes ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Poll votes ensure each wallet can only pick one option per poll post
CREATE TABLE IF NOT EXISTS poll_votes (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id BIGINT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain_id INTEGER,
  contract_address TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Soft-moderation flagging for abuse triage
CREATE TABLE IF NOT EXISTS post_flags (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reporter_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE post_flags ADD COLUMN IF NOT EXISTS reporter_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE post_flags ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE post_flags ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE post_flags ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE post_flags ADD COLUMN IF NOT EXISTS resolution_note TEXT;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_members (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_member_id BIGINT REFERENCES admin_members(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE admin_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE admin_members ADD COLUMN IF NOT EXISTS created_by_member_id BIGINT REFERENCES admin_members(id) ON DELETE SET NULL;
ALTER TABLE admin_members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admin_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_members_role_check'
  ) THEN
    ALTER TABLE admin_members
    ADD CONSTRAINT admin_members_role_check CHECK (role IN ('owner', 'admin'));
  END IF;
END $$;

-- Per-wallet notification and preferences state for a richer app experience
CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  show_wallet_summary BOOLEAN NOT NULL DEFAULT TRUE,
  direct_messages_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  muted_keywords TEXT[] NOT NULL DEFAULT '{}',
  theme TEXT NOT NULL DEFAULT 'dark',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS direct_messages_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT,
  disabled_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes for scrolling feeds + joins
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_mode ON posts(content_mode);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_flags_status ON post_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned, banned_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_auth_type ON users(auth_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id, disabled_at, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_members_active ON admin_members(is_active, role, created_at DESC);
