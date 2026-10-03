<p align="center">
  <img src="assets/images/icon.png" alt="ANON app icon" width="96" />
</p>

<h1 align="center">ANON</h1>

<p align="center">
  <b>Private by default.</b> An anonymous social app where people post, discuss, and react without ever revealing who they are.
</p>

<p align="center">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-Expo%20SDK%2054-000020?logo=expo&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io&logoColor=white" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white" />
</p>

---

## Screenshots

<p align="center">
  <img src="screenshots/home.png" width="200" alt="Home feed" />
  <img src="screenshots/post.png" width="200" alt="Create post" />
  <img src="screenshots/community.png" width="200" alt="Community chat" />
  <img src="screenshots/profile.png" width="200" alt="Profile" />
</p>
<p align="center"><sub>Home feed · Create post · Community chat · Profile</sub></p>

## Overview

Most anonymous-message apps make users share a link and collect replies by hand. ANON gives people a shared space instead: a public feed or private invite-only communities, where they can post, comment, vote, and react while staying anonymous.

Anonymity is handled on the server, not just hidden in the UI. The API never sends another user's identity to the client, so it can't be recovered by inspecting network traffic.

## Key features

| | |
|---|---|
| **Anonymous posting** | Text, images, polls, and 24-hour disappearing posts with no identity attached |
| **Private communities** | Invite-only rooms with auto-generated join codes, admin roles, member approval, and moderation |
| **Real-time feed** | New posts appear live through Socket.IO, with no manual refresh needed |
| **Reactions & voting** | Emoji reactions (tap or long-press) plus upvote/downvote |
| **Threaded comments** | Discussions on any post |
| **Full-text search** | Server-side search across the whole feed |
| **Notifications** | In-app and push notifications for replies, votes, community activity, and moderation |
| **Account security** | Email/password auth, email verification, password reset by emailed code, JWT sessions |
| **Saved posts** | Bookmark posts to come back to later |
| **Admin dashboard** | Separate web panel for moderation; changes show in the live app immediately |

## Tech stack

**Mobile app:** React Native, Expo (SDK 54), TypeScript, React Navigation, Socket.IO client, Expo Notifications, Expo Haptics

**Backend:** Node.js, Express, PostgreSQL, Socket.IO, JWT authentication, Cloudinary (media), Resend (transactional email)

**Infrastructure:** EAS Build (Android APKs), Render (API and admin dashboard hosting)

## Architecture

```
┌──────────────────┐     REST + WebSocket     ┌──────────────────────┐      ┌──────────────┐
│  Mobile app      │ ───────────────────────▶ │  Express API         │ ───▶ │  PostgreSQL  │
│  (React Native)  │ ◀─────────────────────── │  + Socket.IO server  │      └──────────────┘
└──────────────────┘    anonymized payloads   └──────────────────────┘
                                                 ▲        │
┌──────────────────┐                             │        ├──▶ Cloudinary (images)
│  Admin dashboard │ ────────────────────────────┘        ├──▶ Resend (email)
│  (web)           │                                      └──▶ Expo Push (notifications)
└──────────────────┘
```

## Project structure

```
.
├── App.js                         # Entry point, providers, error boundary
├── src/
│   ├── screens/                   # Home, Discover, Post composer, Communities, Profile, Auth
│   ├── components/                # Shared UI (HeroHeading, Skeleton, Toast, ...)
│   ├── contexts/                  # Auth and toast state
│   ├── services/                  # API client
│   ├── utils/                     # Haptics, saved posts, error handling
│   └── admin/AdminDashboard.tsx   # Moderation web panel
└── anonymous-app-backend/
    ├── controllers/               # Route handlers
    ├── models/                    # Database queries
    ├── routes/                    # Express routers
    ├── services/                  # Notifications, push, email, trending
    └── database/schema.sql        # PostgreSQL schema
```

## Running locally

**Prerequisites:** Node.js 20+, PostgreSQL, and Android Studio (or an [EAS](https://expo.dev/eas) account for cloud builds).

### 1. Backend

```bash
cd anonymous-app-backend
npm install
cp .env.example .env     # set DATABASE_URL, JWT_SECRET, Cloudinary and Resend keys
npm run db:migrate       # applies database/schema.sql
npm run dev              # API runs on http://localhost:4000
```

### 2. Mobile app

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:4000
```

Then install and build. The app uses native modules, so it **won't run in Expo Go**:

```bash
npm install
npx expo run:android                                   # local build to a device or emulator
eas build --platform android --profile preview         # or: cloud build that produces an installable APK
```

### 3. Admin dashboard (optional)

```bash
npm run admin:web
```

## Deployment

The backend and admin dashboard deploy to [Render](https://render.com) with the included [`render.yaml`](render.yaml) blueprint. Android builds are produced with EAS Build.

## Author

**Jeph** · [GitHub @jephcoded](https://github.com/jephcoded)

Designed and built end to end: mobile app, backend API, database, real-time layer, and admin tooling.
