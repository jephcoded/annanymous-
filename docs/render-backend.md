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
- `SOCIAL_CONTRACT_ADDRESS` optional for now

## After first deploy

Run the schema once against the production database:

```bash
npm run db:migrate
```

## Frontend follow-up

After Render gives you a backend URL, rebuild the mobile app with:

- `EXPO_PUBLIC_API_BASE_URL=https://<your-render-backend>.onrender.com/api/v1`

If you use the existing frontend config, the installed APK will not be able to reach your local PC backend.