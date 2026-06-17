# Last.fm Advanced Dashboard — Design Spec

**Date:** 2026-06-17  
**Status:** Approved

---

## Overview

A multi-user Last.fm analytics dashboard. Authenticated users get a personal dashboard. Anyone can browse public profiles at `/user/[username]` (like Last.fm itself). All Last.fm data is stored locally in our own database to bypass the 5 req/s API rate limit and enable offline access.

---

## Architecture

**Option chosen:** Next.js App Router + separate sync worker (Option B)

Two processes sharing one Postgres database via Prisma:

- `npm run dev` — Next.js web app (port 3000)
- `npm run worker` — Node.js background sync worker

```
lastfm-advanced/
├── app/
│   ├── (auth)/                 # Login / OAuth callback pages
│   ├── user/[username]/        # Public profile pages
│   ├── dashboard/              # Authenticated personal dashboard
│   └── api/
│       ├── auth/               # NextAuth endpoints
│       └── sync/               # Manual sync trigger endpoint
├── worker/
│   └── sync.ts                 # Background polling process
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── lib/
│   ├── lastfm.ts               # Last.fm API client wrapper
│   ├── prisma.ts               # Prisma client singleton
│   └── sync.ts                 # Shared sync logic
├── components/                 # shadcn/ui + custom components
├── docker-compose.yml          # Postgres service
├── .env.example
└── package.json
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (latest, App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js with custom Last.fm OAuth provider |
| ORM | Prisma |
| Database | PostgreSQL (Docker Compose locally) |
| Background worker | Node.js script (`tsx` / `ts-node`) |

---

## Data Model

```prisma
model User {
  id                String    @id @default(cuid())
  lastfmUsername    String    @unique
  sessionKey        String    // permanent Last.fm session key
  lastSyncedAt      DateTime?
  lastManualSyncAt  DateTime? // for 5-min cooldown enforcement
  createdAt         DateTime  @default(now())

  scrobbles   Scrobble[]
  topArtists  TopArtist[]
  topAlbums   TopAlbum[]
  topTracks   TopTrack[]
  lovedTracks LovedTrack[]
}

model Scrobble {
  id          String   @id @default(cuid())
  userId      String
  artist      String
  album       String?
  track       String
  scrobbledAt DateTime
  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, scrobbledAt])
}

model TopArtist {
  id        String @id @default(cuid())
  userId    String
  name      String
  playcount Int
  period    String  // "7day" | "1month" | "3month" | "6month" | "12month" | "overall"
  rank      Int
  user      User   @relation(fields: [userId], references: [id])

  @@unique([userId, name, period])
}

model TopAlbum {
  id        String @id @default(cuid())
  userId    String
  name      String
  artist    String
  playcount Int
  period    String
  rank      Int
  user      User   @relation(fields: [userId], references: [id])

  @@unique([userId, name, artist, period])
}

model TopTrack {
  id        String @id @default(cuid())
  userId    String
  name      String
  artist    String
  playcount Int
  period    String
  rank      Int
  user      User   @relation(fields: [userId], references: [id])

  @@unique([userId, name, artist, period])
}

model LovedTrack {
  id      String   @id @default(cuid())
  userId  String
  artist  String
  track   String
  lovedAt DateTime
  user    User     @relation(fields: [userId], references: [id])

  @@unique([userId, artist, track])
}
```

---

## Authentication

Last.fm uses a non-standard OAuth 1.0-style flow. A custom NextAuth provider handles it:

1. User clicks "Sign in with Last.fm"
2. Redirected to Last.fm authorization URL with API key
3. User grants access, redirected to `/api/auth/callback/lastfm`
4. App exchanges token for a permanent session key via `auth.getSession`
5. Session key stored on `User.sessionKey` — never expires

**Required env vars:**
```
LASTFM_API_KEY=
LASTFM_API_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
DATABASE_URL=
```

---

## Sync Strategy

**Shared sync function** (`lib/sync.ts`):
```
syncUser(username) →
  fetch recentTracks (paginated, incremental from lastSyncedAt)
  fetch topArtists/albums/tracks for all 6 periods
  fetch lovedTracks
  upsert all data into DB
  update lastSyncedAt
```

**Background worker** (`worker/sync.ts`):
- Polls every 10 minutes
- Syncs all registered users sequentially with delay between requests
- Respects Last.fm rate limits

**On-demand sync:**
- Public profile viewed with no local data → triggers one-off sync before rendering

**Manual sync** (`POST /api/sync`):
- Requires authentication
- Returns 429 if `lastManualSyncAt` < 5 minutes ago
- On success, returns new `lastSyncedAt`
- UI: sync button disables with countdown timer for 5 min after use

---

## Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with search bar and sign-in button |
| `/login` | Public | Triggers Last.fm OAuth |
| `/dashboard` | Auth required | Personal dashboard |
| `/user/[username]` | Public | Public read-only profile |
| `/api/auth/[...nextauth]` | — | NextAuth handler |
| `/api/sync` | Auth required | Manual sync trigger |

---

## Shared `<UserProfile>` Component

Used by both `/dashboard` and `/user/[username]`:

- **Header** — avatar, username, total scrobbles, join date, last synced time, sync button (authenticated users only, 5-min cooldown with countdown)
- **Recent Tracks** — scrollable feed, artist / album / track / timestamp
- **Top Artists / Albums / Tracks** — tabbed card with period selector (7 days, 1 month, 3 months, 6 months, 12 months, all time)
- **Loved Tracks** — grid layout
- **Stats** — scrobbles-over-time chart (bar or line), listening streaks

**Search:** Global search bar on landing + nav. Searches by Last.fm username, navigates to `/user/[username]`. If user not in DB, shows loading state while triggering on-demand sync.

---

## npm Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "tsx watch worker/sync.ts",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

---

## Out of Scope (MVP)

- Social features (friends, comparisons) — data model ready, UI deferred
- BullMQ job queue — upgrade path when needed
- Deployment configuration — decided later
