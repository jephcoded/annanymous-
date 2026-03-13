-- Core user record keyed by wallet
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posts include optional media and are linked to the authoring wallet
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  content_cid TEXT,
  content_hash TEXT,
  chain_id INTEGER,
  contract_address TEXT,
  transaction_hash TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_cid TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS chain_id INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending';

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-wallet notification and preferences state for a richer app experience
CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  show_wallet_summary BOOLEAN NOT NULL DEFAULT TRUE,
  muted_keywords TEXT[] NOT NULL DEFAULT '{}',
  theme TEXT NOT NULL DEFAULT 'dark',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Helpful indexes for scrolling feeds + joins
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
