# Render backend deploy

Deploy the backend from this repo with Render using the blueprint in [render.yaml](../render.yaml).

## Render service settings

- Service type: Web Service
- Root directory: `anonymous-app-backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/v1/health`

## Required environment variables

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PGSSLMODE=require`
- `CHAIN_ID=84532`
- `ADMIN_PANEL_EMAIL`
- `ADMIN_PANEL_PASSWORD`
- `SOCIAL_CONTRACT_ADDRESS` optional for now

## Admin dashboard authentication

- `ADMIN_PANEL_EMAIL` and `ADMIN_PANEL_PASSWORD` gate the standalone admin dashboard before it opens.
- `ADMIN_WALLETS` is still supported for wallet-based admin login.
- `CLIENT_ORIGIN` should include every frontend origin that must call the backend, including the standalone admin page. Example:

```env
CLIENT_ORIGIN=http://localhost:19006,http://127.0.0.1:62208,http://localhost:62208,https://your-admin-site.example
```

- Owner login comes from the environment credentials above.
- Additional admin members are created inside the dashboard after the owner signs in.

## After first deploy

Run the schema once against the production database:

```bash
npm run db:migrate
```

This migration is required for the admin dashboard because it creates and updates:

- `admin_members`
- `admin_activity_logs`
- moderation columns such as `users.is_banned`, `posts.deleted_at`, and report review fields

## Frontend follow-up

After Render gives you a backend URL, rebuild the mobile app with:

- `EXPO_PUBLIC_API_BASE_URL=https://<your-render-backend>.onrender.com/api/v1`

If you use the existing frontend config, the installed APK will not be able to reach your local PC backend.
