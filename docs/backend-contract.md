# Anonymous App Backend Contract

## 1. Environment Matrix

| Stage | Base URL                        | Notes                                         |
| ----- | ------------------------------- | --------------------------------------------- |
| Local | `http://localhost:4000`         | Run via `npm run dev` in backend repo         |
| Dev   | `https://api-dev.ananymous.app` | Exposed through tunnel/VPS for device testing |
| Prod  | `https://api.ananymous.app`     | Hardened TLS, WAF enabled                     |

All environments share the same REST contract. Version prefix: `/api/v1`.

## 2. Authentication Flow

Chosen wallet stack for current implementation:

- Wallet provider: MetaMask
- Network: Ethereum
- Auth mode: wallet signature challenge + JWT session

1. **Challenge:** `POST /api/v1/auth/challenge` `{ walletAddress }` → returns `{ challenge, expiresAt }`.
2. **Verify:** `POST /api/v1/auth/verify` `{ walletAddress, signature }` → returns `{ token, user }`.
3. Mobile stores `token` (JWT). All protected endpoints require header `Authorization: Bearer <token>`.
4. Tokens expire in 12h. Refresh by repeating verify call.

## 3. REST Endpoints

### Feed & Posts

| Method | Path                         | Description                                            |
| ------ | ---------------------------- | ------------------------------------------------------ |
| GET    | `/api/v1/posts`              | Paginated feed. Query: `cursor`, `limit` (default 20). |
| POST   | `/api/v1/posts`              | Create anonymous post. Requires auth.                  |
| GET    | `/api/v1/posts/:postId`      | Single post detail.                                    |
| POST   | `/api/v1/posts/:postId/flag` | Report abusive content.                                |

**Sample: GET /posts Response**

```json
{
  "data": [
    {
      "id": "post_8241",
      "body": "Should Nigeria remove fuel subsidy?",
      "mediaUrl": null,
      "upVotes": 142,
      "downVotes": 18,
      "comments": 21,
      "createdAt": "2026-03-10T11:54:00.000Z",
      "author": {
        "alias": "Anonymous #8241",
        "wallet": "0x3f...28a"
      }
    }
  ],
  "paging": {
    "cursor": "post_8241",
    "hasMore": true
  }
}
```

**Sample: POST /posts Body**

```json
{
  "body": "Police checkpoint extorting drivers in Ikeja.",
  "media": "data:image/jpeg;base64,...",
  "pollOptions": ["Yes", "No"]
}
```

Backend uploads `media` to Cloudinary and returns stored URL.

### Comments

| Method | Path                             |
| ------ | -------------------------------- |
| GET    | `/api/v1/posts/:postId/comments` |
| POST   | `/api/v1/posts/:postId/comments` |

**Sample Response**

```json
{
  "data": [
    {
      "id": "c_9044",
      "message": "This is very true.",
      "createdAt": "2026-03-10T12:01:00Z"
    }
  ]
}
```

### Votes

| Method | Path                          | Payload                   |
| ------ | ----------------------------- | ------------------------- | --------- |
| POST   | `/api/v1/posts/:postId/votes` | `{ "direction": "up"      | "down" }` |
| POST   | `/api/v1/polls/:pollId/votes` | `{ "optionId": "opt_1" }` |

### Polls

| Method | Path                    |
| ------ | ----------------------- |
| GET    | `/api/v1/polls/current` |
| POST   | `/api/v1/polls` (admin) |

### Wallet Snapshot

| Method | Path                  |
| ------ | --------------------- |
| GET    | `/api/v1/wallet/me`   |
| POST   | `/api/v1/wallet/sync` |

`wallet/me` aggregates posts, votes, holdings from Postgres; `wallet/sync` triggers fetch from upstream provider (e.g., CoinGecko) and caches results.

## 4. Database Schema (PostgreSQL)

- **users** (`id`, `wallet_address` unique, `created_at`).
- **posts** (`id`, `user_id`, `body`, `media_url`, `poll_question`, `created_at`).
- **comments** (`id`, `post_id`, `user_id`, `message`, `created_at`).
- **votes** (`id`, `post_id`, `user_id`, `direction`).
- **poll_options** (`id`, `post_id`, `label`, `vote_count`).
- **wallet_snapshots** (`id`, `user_id`, `balance_usd`, `posts`, `votes`, `synced_at`).

Indexes on `posts(created_at DESC)` and `comments(post_id, created_at)`.

## 5. Cloudinary Integration

- Use signed uploads from backend: `POST /api/v1/uploads/signature` → `{ signature, timestamp, cloudName, apiKey }`.
- Mobile uploads directly to Cloudinary using returned signature.
- On success, client calls `POST /posts` with `mediaUrl` pointing to Cloudinary resource.

## 6. Socket.io Events

Namespace `/feed`:

- `connect` (client sends `{ token }`, server validates).
- `feed:new-post` payload `{ post }`.
- `feed:update-votes` payload `{ postId, upVotes, downVotes }`.

Namespace `/comments`:

- Join room `post:{postId}`.
- Events: `comment:new`, `comment:typing`.

## 7. Error Format

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post does not exist",
    "status": 404
  }
}
```

Use standardized codes for client handling.

## 8. Rate Limits

Apply `rateLimiter` middleware:

- Posting: 5 requests / 60s per wallet.
- Comments: 15 / 60s.
- Voting: 30 / 60s.

## 9. Moderation Rules

- Anonymous posting/commenting is allowed only after successful wallet authentication.
- Users remain publicly anonymous; wallet addresses stay backend-side only.
- Reporting/flagging is enabled for abusive or unsafe content.
- Moderation review should support flagged posts and flagged comments.

## 10. Remaining External Inputs Needed

1. Confirm actual base URLs/domains and SSL setup.
2. Provide Cloudinary credentials (cloud name, API key/secret, upload presets).
3. Supply JWT signing secret or wallet verification public key.
4. Share Redis or in-memory store details if we rate-limit or queue notifications.
5. Decide on upstream price feed API (CoinGecko, etc.) and provide API key if required.
6. Provide push notification provider keys if `notificationService` must send pushes.
7. Provide hosted PostgreSQL connection string (recommended for deployment).

Once these details are ready and backend repo is initialized with the structure above, the mobile client can start hitting `/api/v1/...` endpoints.
