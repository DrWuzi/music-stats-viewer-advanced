# Last.fm Advanced Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-user Last.fm analytics dashboard with public profiles, local PostgreSQL data cache, background sync, and a separate sync worker process.

**Architecture:** Next.js 15 App Router for the web app + a separate Node.js worker process for background polling, both sharing a PostgreSQL database via Prisma. Auth is a custom Last.fm OAuth flow (no NextAuth) using jose JWT sessions stored in HttpOnly cookies.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL 16 (Docker Compose), jose, Recharts, Vitest, @testing-library/react

## Global Constraints
- Node.js 20+
- Next.js 15 App Router — `cookies()`, `headers()`, `params` are Promises — always `await` them
- TypeScript strict mode
- Last.fm API base URL: `https://ws.audioscrobbler.com/2.0/`
- Manual sync cooldown: 5 minutes per user (return 429 if too soon)
- Background worker polls all users every 10 minutes, sequential with 300ms delay between users
- API signature: `md5(sorted-concatenated-key-value-pairs + secret)`, exclude `format` key
- Sessions: HttpOnly cookie named `session`, 30-day expiry, jose HS256 JWT, payload `{ userId, lastfmUsername }`
- No NextAuth — custom Last.fm OAuth only
- Use `rtk` prefix for all git and shell commands per project convention

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (updated scripts)
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

**Interfaces:**
- Produces: Running dev server at localhost:3000, Postgres at localhost:5432, passing `npm test` baseline

- [ ] **Step 1: Bootstrap Next.js 15**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias="@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client jose recharts
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom vite-tsconfig-paths tsx
npx shadcn@latest init
```

When prompted by shadcn: New York style, neutral base color, CSS variables yes.

- [ ] **Step 3: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lastfm
      POSTGRES_PASSWORD: lastfm
      POSTGRES_DB: lastfm_advanced
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 5: Create .env.example**

```
LASTFM_API_KEY=
LASTFM_API_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://lastfm:lastfm@localhost:5432/lastfm_advanced
```

Copy and fill in:
```bash
cp .env.example .env
# Generate NEXTAUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
  },
})
```

- [ ] **Step 7: Create tests/setup.ts**

```typescript
import '@testing-library/jest-dom'

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
```

- [ ] **Step 8: Update package.json scripts**

Replace the `scripts` section in `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "worker": "tsx --env-file=.env worker/sync.ts",
  "worker:dev": "tsx watch --env-file=.env worker/sync.ts",
  "docker:up": "docker-compose up -d",
  "docker:down": "docker-compose down",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 9: Start Postgres and verify**

```bash
npm run docker:up
```

Expected: `✔ Container lastfm-advanced-postgres-1  Started`

- [ ] **Step 10: Commit**

```bash
rtk git add package.json docker-compose.yml .env.example vitest.config.ts tests/setup.ts
rtk git commit -m "chore: project scaffolding — Next.js 15, Prisma, Docker, Vitest"
```

---

### Task 2: Prisma Schema & DB Client

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `tests/lib/prisma.test.ts`

**Interfaces:**
- Produces: `prisma` singleton exported from `@/lib/prisma`
- Produces models: `User`, `Scrobble`, `TopArtist`, `TopAlbum`, `TopTrack`, `LovedTrack`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/prisma.test.ts
import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('exports a prisma client instance', async () => {
    const { prisma } = await import('@/lib/prisma')
    expect(prisma).toBeDefined()
    expect(typeof prisma.user.findMany).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/lib/prisma.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/prisma'"

- [ ] **Step 3: Write prisma/schema.prisma**

Replace the full contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(cuid())
  lastfmUsername    String    @unique
  sessionKey        String
  lastSyncedAt      DateTime?
  lastManualSyncAt  DateTime?
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
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, scrobbledAt])
}

model TopArtist {
  id        String @id @default(cuid())
  userId    String
  name      String
  playcount Int
  period    String
  rank      Int
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name, artist, period])
}

model LovedTrack {
  id      String   @id @default(cuid())
  userId  String
  artist  String
  track   String
  lovedAt DateTime
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, artist, track])
}
```

- [ ] **Step 4: Create lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Run migration**

```bash
npm run db:migrate -- --name init
```

Expected: `✔ Generated Prisma Client` and `prisma/migrations/` created.

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- tests/lib/prisma.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
rtk git add prisma/ lib/prisma.ts tests/lib/prisma.test.ts
rtk git commit -m "feat: prisma schema with all models and DB client singleton"
```

---

### Task 3: Last.fm API Client

**Files:**
- Create: `lib/lastfm.ts`
- Create: `tests/lib/lastfm.test.ts`

**Interfaces:**
- Produces type: `Period = '7day' | '1month' | '3month' | '6month' | '12month' | 'overall'`
- Produces interfaces: `LastFmTrack`, `LastFmArtist`, `LastFmAlbum`, `LastFmTrackTop`, `LastFmLovedTrack`, `LastFmUserInfo`
- Produces: `lastfmClient` with methods:
  - `getRecentTracks(username: string, from?: number): Promise<LastFmTrack[]>`
  - `getTopArtists(username: string, period: Period): Promise<LastFmArtist[]>`
  - `getTopAlbums(username: string, period: Period): Promise<LastFmAlbum[]>`
  - `getTopTracks(username: string, period: Period): Promise<LastFmTrackTop[]>`
  - `getLovedTracks(username: string): Promise<LastFmLovedTrack[]>`
  - `getUserInfo(username: string): Promise<LastFmUserInfo>`
  - `getSession(token: string): Promise<{ name: string; key: string }>`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/lastfm.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('lastfmClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.LASTFM_API_KEY = 'test_key'
    process.env.LASTFM_API_SECRET = 'test_secret'
  })

  it('getRecentTracks returns parsed tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Song',
              artist: { '#text': 'Artist' },
              album: { '#text': 'Album' },
              date: { uts: '1700000000' },
            },
          ],
          '@attr': { total: '1' },
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const tracks = await lastfmClient.getRecentTracks('testuser')
    expect(tracks).toHaveLength(1)
    expect(tracks[0].name).toBe('Song')
    expect(tracks[0].artist).toBe('Artist')
  })

  it('getTopArtists returns parsed artists', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topartists: {
          artist: [{ name: 'Artist', playcount: '100', '@attr': { rank: '1' } }],
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const artists = await lastfmClient.getTopArtists('testuser', '7day')
    expect(artists[0].name).toBe('Artist')
    expect(artists[0].playcount).toBe(100)
    expect(artists[0].rank).toBe(1)
  })

  it('throws on Last.fm error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 6, message: 'User not found' }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    await expect(lastfmClient.getRecentTracks('nobody')).rejects.toThrow('User not found')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/lastfm.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/lastfm'"

- [ ] **Step 3: Implement lib/lastfm.ts**

```typescript
import { createHash } from 'crypto'

const BASE = 'https://ws.audioscrobbler.com/2.0/'
const key = () => process.env.LASTFM_API_KEY!
const secret = () => process.env.LASTFM_API_SECRET!

export type Period = '7day' | '1month' | '3month' | '6month' | '12month' | 'overall'

export interface LastFmTrack {
  name: string
  artist: string
  album: string | null
  scrobbledAt: Date | null
  nowPlaying: boolean
}

export interface LastFmArtist {
  name: string
  playcount: number
  rank: number
}

export interface LastFmAlbum {
  name: string
  artist: string
  playcount: number
  rank: number
}

export interface LastFmTrackTop {
  name: string
  artist: string
  playcount: number
  rank: number
}

export interface LastFmLovedTrack {
  name: string
  artist: string
  lovedAt: Date
}

export interface LastFmUserInfo {
  name: string
  playcount: number
  registered: Date
  imageUrl: string
}

function sign(params: Record<string, string>): string {
  const str =
    Object.keys(params)
      .sort()
      .filter((k) => k !== 'format')
      .map((k) => `${k}${params[k]}`)
      .join('') + secret()
  return createHash('md5').update(str).digest('hex')
}

async function call<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE)
  Object.entries({ ...params, api_key: key(), format: 'json' }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  )
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.message ?? `Last.fm error ${data.error}`)
  return data as T
}

async function paginate<TResponse, TItem>(
  params: Record<string, string>,
  getItems: (d: TResponse) => TItem[],
  getTotal: (d: TResponse) => number,
): Promise<TItem[]> {
  const all: TItem[] = []
  let page = 1
  while (true) {
    const data = await call<TResponse>({ ...params, page: String(page), limit: '200' })
    all.push(...getItems(data))
    if (all.length >= getTotal(data)) break
    page++
    await new Promise((r) => setTimeout(r, 250))
  }
  return all
}

export const lastfmClient = {
  async getRecentTracks(username: string, from?: number): Promise<LastFmTrack[]> {
    type R = {
      recenttracks: {
        track: Array<{
          name: string
          artist: { '#text': string }
          album: { '#text': string }
          date?: { uts: string }
          '@attr'?: { nowplaying: string }
        }>
        '@attr': { total: string }
      }
    }
    const p: Record<string, string> = { method: 'user.getrecenttracks', user: username }
    if (from) p.from = String(from)
    const items = await paginate<R, R['recenttracks']['track'][0]>(
      p,
      (d) => d.recenttracks.track,
      (d) => Number(d.recenttracks['@attr'].total),
    )
    return items
      .filter((t) => !t['@attr']?.nowplaying)
      .map((t) => ({
        name: t.name,
        artist: t.artist['#text'],
        album: t.album['#text'] || null,
        scrobbledAt: t.date ? new Date(Number(t.date.uts) * 1000) : null,
        nowPlaying: false,
      }))
  },

  async getTopArtists(username: string, period: Period): Promise<LastFmArtist[]> {
    type R = { topartists: { artist: Array<{ name: string; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettopartists', user: username, period, limit: '50' })
    return data.topartists.artist.map((a) => ({
      name: a.name,
      playcount: Number(a.playcount),
      rank: Number(a['@attr'].rank),
    }))
  },

  async getTopAlbums(username: string, period: Period): Promise<LastFmAlbum[]> {
    type R = { topalbums: { album: Array<{ name: string; artist: { name: string }; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettopalbums', user: username, period, limit: '50' })
    return data.topalbums.album.map((a) => ({
      name: a.name,
      artist: a.artist.name,
      playcount: Number(a.playcount),
      rank: Number(a['@attr'].rank),
    }))
  },

  async getTopTracks(username: string, period: Period): Promise<LastFmTrackTop[]> {
    type R = { toptracks: { track: Array<{ name: string; artist: { name: string }; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettoptracks', user: username, period, limit: '50' })
    return data.toptracks.track.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      playcount: Number(t.playcount),
      rank: Number(t['@attr'].rank),
    }))
  },

  async getLovedTracks(username: string): Promise<LastFmLovedTrack[]> {
    type R = {
      lovedtracks: {
        track: Array<{ name: string; artist: { name: string }; date: { uts: string } }>
        '@attr': { total: string }
      }
    }
    const items = await paginate<R, R['lovedtracks']['track'][0]>(
      { method: 'user.getlovedtracks', user: username },
      (d) => d.lovedtracks.track,
      (d) => Number(d.lovedtracks['@attr'].total),
    )
    return items.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      lovedAt: new Date(Number(t.date.uts) * 1000),
    }))
  },

  async getUserInfo(username: string): Promise<LastFmUserInfo> {
    type R = {
      user: {
        name: string
        playcount: string
        registered: { unixtime: string }
        image: Array<{ '#text': string; size: string }>
      }
    }
    const data = await call<R>({ method: 'user.getinfo', user: username })
    const img = data.user.image.find((i) => i.size === 'large')
    return {
      name: data.user.name,
      playcount: Number(data.user.playcount),
      registered: new Date(Number(data.user.registered.unixtime) * 1000),
      imageUrl: img?.['#text'] ?? '',
    }
  },

  async getSession(token: string): Promise<{ name: string; key: string }> {
    const params = { method: 'auth.getSession', api_key: key(), token }
    const sig = sign(params)
    const url = `${BASE}?method=auth.getSession&api_key=${key()}&token=${token}&api_sig=${sig}&format=json`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(data.message ?? 'Failed to get Last.fm session')
    return { name: data.session.name, key: data.session.key }
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/lastfm.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add lib/lastfm.ts tests/lib/lastfm.test.ts
rtk git commit -m "feat: Last.fm API client with typed methods and pagination"
```

---

### Task 4: Shared Sync Logic

**Files:**
- Create: `lib/sync.ts`
- Create: `tests/lib/sync.test.ts`

**Interfaces:**
- Consumes: `lastfmClient` from `@/lib/lastfm`, `prisma` from `@/lib/prisma`
- Produces: `syncUser(lastfmUsername: string): Promise<void>`
- Produces: `PERIODS: Period[]`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/sync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    scrobble: { createMany: vi.fn() },
    topArtist: { deleteMany: vi.fn(), createMany: vi.fn() },
    topAlbum: { deleteMany: vi.fn(), createMany: vi.fn() },
    topTrack: { deleteMany: vi.fn(), createMany: vi.fn() },
    lovedTrack: { findMany: vi.fn(), createMany: vi.fn() },
  },
}))

vi.mock('@/lib/lastfm', () => ({
  lastfmClient: {
    getRecentTracks: vi.fn().mockResolvedValue([
      { name: 'Song', artist: 'Artist', album: 'Album', scrobbledAt: new Date('2024-01-01'), nowPlaying: false },
    ]),
    getTopArtists: vi.fn().mockResolvedValue([]),
    getTopAlbums: vi.fn().mockResolvedValue([]),
    getTopTracks: vi.fn().mockResolvedValue([]),
    getLovedTracks: vi.fn().mockResolvedValue([]),
  },
  PERIODS: ['7day', '1month', '3month', '6month', '12month', 'overall'],
}))

describe('syncUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates scrobbles for a user', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      lastfmUsername: 'testuser',
      sessionKey: 'key',
      lastSyncedAt: null,
      lastManualSyncAt: null,
      createdAt: new Date(),
    })
    vi.mocked(prisma.scrobble.createMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.lovedTrack.findMany).mockResolvedValue([])
    vi.mocked(prisma.lovedTrack.createMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { syncUser } = await import('@/lib/sync')
    await syncUser('testuser')

    expect(prisma.scrobble.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ track: 'Song', artist: 'Artist' }),
        ]),
      }),
    )
  })

  it('throws when user not found in DB', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const { syncUser } = await import('@/lib/sync')
    await expect(syncUser('nobody')).rejects.toThrow('User nobody not found')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/sync.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/sync'"

- [ ] **Step 3: Implement lib/sync.ts**

```typescript
import { lastfmClient, type Period } from './lastfm'
import { prisma } from './prisma'

export const PERIODS: Period[] = ['7day', '1month', '3month', '6month', '12month', 'overall']

export async function syncUser(lastfmUsername: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { lastfmUsername } })
  if (!user) throw new Error(`User ${lastfmUsername} not found`)

  const from = user.lastSyncedAt ? Math.floor(user.lastSyncedAt.getTime() / 1000) : undefined

  const tracks = await lastfmClient.getRecentTracks(lastfmUsername, from)
  if (tracks.length > 0) {
    await prisma.scrobble.createMany({
      data: tracks.map((t) => ({
        userId: user.id,
        artist: t.artist,
        album: t.album,
        track: t.name,
        scrobbledAt: t.scrobbledAt ?? new Date(),
      })),
      skipDuplicates: true,
    })
  }

  for (const period of PERIODS) {
    const [artists, albums, topTracks] = await Promise.all([
      lastfmClient.getTopArtists(lastfmUsername, period),
      lastfmClient.getTopAlbums(lastfmUsername, period),
      lastfmClient.getTopTracks(lastfmUsername, period),
    ])
    await prisma.topArtist.deleteMany({ where: { userId: user.id, period } })
    await prisma.topAlbum.deleteMany({ where: { userId: user.id, period } })
    await prisma.topTrack.deleteMany({ where: { userId: user.id, period } })
    await Promise.all([
      prisma.topArtist.createMany({ data: artists.map((a) => ({ ...a, userId: user.id, period })) }),
      prisma.topAlbum.createMany({ data: albums.map((a) => ({ ...a, userId: user.id, period })) }),
      prisma.topTrack.createMany({ data: topTracks.map((t) => ({ ...t, userId: user.id, period })) }),
    ])
  }

  const loved = await lastfmClient.getLovedTracks(lastfmUsername)
  const existing = await prisma.lovedTrack.findMany({
    where: { userId: user.id },
    select: { artist: true, track: true },
  })
  const existingKeys = new Set(existing.map((l) => `${l.artist}::${l.track}`))
  const newLoved = loved.filter((l) => !existingKeys.has(`${l.artist}::${l.name}`))
  if (newLoved.length > 0) {
    await prisma.lovedTrack.createMany({
      data: newLoved.map((l) => ({
        userId: user.id,
        artist: l.artist,
        track: l.name,
        lovedAt: l.lovedAt,
      })),
      skipDuplicates: true,
    })
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastSyncedAt: new Date() } })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/sync.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add lib/sync.ts tests/lib/sync.test.ts
rtk git commit -m "feat: shared sync logic with incremental scrobble fetch and top-list refresh"
```

---

### Task 5: Last.fm Auth System

**Files:**
- Create: `lib/session.ts`
- Create: `app/api/auth/lastfm/login/route.ts`
- Create: `app/api/auth/lastfm/callback/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `middleware.ts`
- Create: `tests/lib/session.test.ts`

**Interfaces:**
- Produces type: `Session = { userId: string; lastfmUsername: string }`
- Produces from `@/lib/session`: `getSession(): Promise<Session | null>`, `createSession(s: Session): Promise<string>`, `sessionCookieOptions()`
- Produces: `/dashboard` protected — redirects unauthenticated requests to `/login`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/session.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

describe('getSession', () => {
  it('returns null when no session cookie exists', async () => {
    process.env.NEXTAUTH_SECRET = 'test-secret-that-is-at-least-32-chars-ok'
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    expect(session).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/lib/session.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/session'"

- [ ] **Step 3: Implement lib/session.ts**

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface Session {
  userId: string
  lastfmUsername: string
}

const COOKIE = 'session'
const DAYS = 30

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function createSession(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${DAYS}d`)
    .sign(getSecret())
}

export function sessionCookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * DAYS,
    path: '/',
  }
}
```

- [ ] **Step 4: Implement app/api/auth/lastfm/login/route.ts**

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const cb = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/auth/lastfm/callback`)
  return NextResponse.redirect(
    `https://www.last.fm/api/auth/?api_key=${process.env.LASTFM_API_KEY}&cb=${cb}`,
  )
}
```

- [ ] **Step 5: Implement app/api/auth/lastfm/callback/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'
import { prisma } from '@/lib/prisma'
import { createSession, sessionCookieOptions } from '@/lib/session'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=missing_token', request.url))

  try {
    const { name, key } = await lastfmClient.getSession(token)
    const user = await prisma.user.upsert({
      where: { lastfmUsername: name },
      update: { sessionKey: key },
      create: { lastfmUsername: name, sessionKey: key },
    })

    const jwt = await createSession({ userId: user.id, lastfmUsername: name })
    const { name: cookieName, ...opts } = sessionCookieOptions()

    const res = NextResponse.redirect(new URL('/dashboard', request.url))
    res.cookies.set(cookieName, jwt, opts)
    return res
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}
```

- [ ] **Step 6: Implement app/api/auth/logout/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { sessionCookieOptions } from '@/lib/session'

export async function POST(request: Request) {
  const { name: cookieName, ...opts } = sessionCookieOptions()
  const res = NextResponse.redirect(new URL('/', new URL(request.url).origin))
  res.cookies.set(cookieName, '', { ...opts, maxAge: 0 })
  return res
}
```

- [ ] **Step 7: Implement middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = { matcher: ['/dashboard/:path*'] }
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test -- tests/lib/session.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
rtk git add lib/session.ts app/api/auth/ middleware.ts tests/lib/session.test.ts
rtk git commit -m "feat: Last.fm OAuth flow, JWT session management, and route middleware"
```

---

### Task 6: Manual Sync API Route

**Files:**
- Create: `app/api/sync/route.ts`
- Create: `tests/api/sync.test.ts`

**Interfaces:**
- Consumes: `getSession()` from `@/lib/session`, `syncUser()` from `@/lib/sync`, `prisma` from `@/lib/prisma`
- Produces: `POST /api/sync` → `200 { lastSyncedAt }` | `401` | `429 { error, retryAfter }`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/api/sync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/sync', () => ({ syncUser: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

describe('POST /api/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 429 when synced less than 5 minutes ago', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      lastfmUsername: 'user',
      sessionKey: 'key',
      lastSyncedAt: null,
      lastManualSyncAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(429)
  })

  it('returns 200 with lastSyncedAt when allowed', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    const now = new Date()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', lastfmUsername: 'user', sessionKey: 'key',
      lastSyncedAt: null, lastManualSyncAt: null, createdAt: new Date(),
    })
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'u1', lastfmUsername: 'user', sessionKey: 'key',
      lastSyncedAt: now, lastManualSyncAt: now, createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('lastSyncedAt')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/api/sync.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/sync/route'"

- [ ] **Step 3: Implement app/api/sync/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { syncUser } from '@/lib/sync'
import { prisma } from '@/lib/prisma'

const COOLDOWN_MS = 5 * 60 * 1000

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.lastManualSyncAt) {
    const elapsed = Date.now() - user.lastManualSyncAt.getTime()
    if (elapsed < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }
  }

  await syncUser(user.lastfmUsername)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastManualSyncAt: new Date() },
  })

  return NextResponse.json({ lastSyncedAt: updated.lastSyncedAt })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/api/sync.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add app/api/sync/route.ts tests/api/sync.test.ts
rtk git commit -m "feat: manual sync API route with 5-minute cooldown"
```

---

### Task 7: Background Worker

**Files:**
- Create: `worker/sync.ts`

**Interfaces:**
- Consumes: `syncUser` from `../lib/sync`, `PrismaClient` from `@prisma/client`
- No automated test — verified by running `npm run worker:dev` manually

- [ ] **Step 1: Create worker/sync.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import { syncUser } from '../lib/sync'

const prisma = new PrismaClient()
const INTERVAL_MS = 10 * 60 * 1000
const USER_DELAY_MS = 300

async function runCycle() {
  console.log(`[worker] Sync cycle started at ${new Date().toISOString()}`)
  const users = await prisma.user.findMany({
    where: { sessionKey: { not: '' } },
    select: { lastfmUsername: true },
  })
  console.log(`[worker] Syncing ${users.length} users`)

  for (const user of users) {
    try {
      await syncUser(user.lastfmUsername)
      console.log(`[worker] ✓ ${user.lastfmUsername}`)
    } catch (err) {
      console.error(`[worker] ✗ ${user.lastfmUsername}:`, err)
    }
    await new Promise((r) => setTimeout(r, USER_DELAY_MS))
  }

  console.log('[worker] Cycle complete')
}

async function main() {
  console.log('[worker] Last.fm sync worker started')
  await runCycle()
  setInterval(runCycle, INTERVAL_MS)
}

main().catch((err) => {
  console.error('[worker] Fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify worker starts**

```bash
npm run worker:dev
```

Expected output:
```
[worker] Last.fm sync worker started
[worker] Sync cycle started at ...
[worker] Syncing 0 users
[worker] Cycle complete
```

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
rtk git add worker/sync.ts
rtk git commit -m "feat: background sync worker with 10-minute polling interval"
```

---

### Task 8: App Layout, Nav & Login Page

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/nav.tsx`
- Create: `components/search-form.tsx`
- Create: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `getSession()` from `@/lib/session`
- Produces: global nav with username/sign-out when authenticated; login page with Last.fm sign-in button

- [ ] **Step 1: Install shadcn/ui components**

```bash
npx shadcn@latest add button card avatar input
```

- [ ] **Step 2: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Last.fm Advanced',
  description: 'Advanced Last.fm analytics dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="min-h-screen bg-background">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create components/nav.tsx**

```tsx
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/button'

export async function Nav() {
  const session = await getSession()

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold text-lg">
          Last.fm Advanced
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href={`/user/${session.lastfmUsername}`} className="text-sm text-muted-foreground hover:text-foreground">
                {session.lastfmUsername}
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <form action="/api/auth/logout" method="POST">
                <Button variant="ghost" size="sm" type="submit">Sign out</Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create components/search-form.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchForm() {
  const [username, setUsername] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (username.trim()) router.push(`/user/${username.trim()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <Input
        placeholder="Last.fm username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  )
}
```

- [ ] **Step 5: Create app/(auth)/login/page.tsx**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Connect your Last.fm account to get started</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-destructive text-center">
              {error === 'auth_failed'
                ? 'Authentication failed. Please try again.'
                : 'Something went wrong.'}
            </p>
          )}
          <Link href="/api/auth/lastfm/login">
            <Button className="w-full">Sign in with Last.fm</Button>
          </Link>
          <p className="text-xs text-center text-muted-foreground">
            You&apos;ll be redirected to Last.fm to authorize access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000` — nav bar renders.
Open `http://localhost:3000/login` — sign-in card renders.

- [ ] **Step 7: Commit**

```bash
rtk git add app/layout.tsx components/nav.tsx components/search-form.tsx app/(auth)/
rtk git commit -m "feat: app layout, navigation, login page"
```

---

### Task 9: Sync Status Component

**Files:**
- Create: `components/sync-status.tsx`
- Create: `tests/components/sync-status.test.tsx`

**Interfaces:**
- Consumes props: `lastSyncedAt: Date | null`, `isOwner: boolean`
- Produces: `<SyncStatus lastSyncedAt={...} isOwner={...} />` — last sync time badge + sync button with 5-min countdown (owner only)

- [ ] **Step 1: Install shadcn/ui components**

```bash
npx shadcn@latest add badge
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/components/sync-status.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncStatus } from '@/components/sync-status'

describe('SyncStatus', () => {
  it('shows "Never synced" when lastSyncedAt is null', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={false} />)
    expect(screen.getByText(/never synced/i)).toBeInTheDocument()
  })

  it('shows relative sync time when lastSyncedAt is set', () => {
    render(<SyncStatus lastSyncedAt={new Date(Date.now() - 60000)} isOwner={false} />)
    expect(screen.getByText(/synced/i)).toBeInTheDocument()
  })

  it('shows sync button for owner', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={true} />)
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
  })

  it('hides sync button for non-owner', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={false} />)
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- tests/components/sync-status.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Implement components/sync-status.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const COOLDOWN = 5 * 60

function rel(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function SyncStatus({
  lastSyncedAt,
  isOwner,
}: {
  lastSyncedAt: Date | null
  isOwner: boolean
}) {
  const [cooldown, setCooldown] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (res.status === 429) {
        const data = await res.json()
        setCooldown(data.retryAfter ?? COOLDOWN)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSyncedAt(new Date(data.lastSyncedAt))
        setCooldown(COOLDOWN)
      }
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="secondary">
        {syncedAt ? `Synced ${rel(syncedAt)}` : 'Never synced'}
      </Badge>
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing || cooldown > 0}
        >
          {syncing ? 'Syncing…' : cooldown > 0 ? `Sync (${cooldown}s)` : 'Sync now'}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/components/sync-status.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
rtk git add components/sync-status.tsx tests/components/sync-status.test.tsx
rtk git commit -m "feat: sync status component with countdown and manual sync button"
```

---

### Task 10: Recent Tracks Component

**Files:**
- Create: `components/recent-tracks.tsx`
- Create: `tests/components/recent-tracks.test.tsx`

**Interfaces:**
- Consumes props: `tracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]`
- Produces: `<RecentTracks tracks={...} />`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/components/recent-tracks.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentTracks } from '@/components/recent-tracks'

const tracks = [
  { artist: 'Radiohead', album: 'OK Computer', track: 'Karma Police', scrobbledAt: new Date() },
  { artist: 'Boards of Canada', album: null, track: 'Roygbiv', scrobbledAt: new Date() },
]

describe('RecentTracks', () => {
  it('renders all tracks', () => {
    render(<RecentTracks tracks={tracks} />)
    expect(screen.getByText('Karma Police')).toBeInTheDocument()
    expect(screen.getByText('Roygbiv')).toBeInTheDocument()
  })

  it('shows artist names', () => {
    render(<RecentTracks tracks={tracks} />)
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
  })

  it('shows empty state when no tracks', () => {
    render(<RecentTracks tracks={[]} />)
    expect(screen.getByText(/no tracks/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/components/recent-tracks.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement components/recent-tracks.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Track {
  artist: string
  album: string | null
  track: string
  scrobbledAt: Date
}

function fmt(date: Date): string {
  const today = new Date()
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today ${time}`
  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)
  if (date.toDateString() === yest.toDateString()) return `Yesterday ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
}

export function RecentTracks({ tracks }: { tracks: Track[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracks scrobbled yet.</p>
        ) : (
          <ul className="divide-y">
            {tracks.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{t.track}</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {t.artist}{t.album ? ` — ${t.album}` : ''}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground ml-4 shrink-0">{fmt(t.scrobbledAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/components/recent-tracks.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add components/recent-tracks.tsx tests/components/recent-tracks.test.tsx
rtk git commit -m "feat: recent tracks component"
```

---

### Task 11: Top Lists Component

**Files:**
- Create: `components/top-lists.tsx`
- Create: `tests/components/top-lists.test.tsx`

**Interfaces:**
- Consumes props:
  ```typescript
  {
    artists: { name: string; playcount: number; rank: number }[]
    albums: { name: string; artist: string; playcount: number; rank: number }[]
    tracks: { name: string; artist: string; playcount: number; rank: number }[]
    period: Period
    onPeriodChange: (p: Period) => void
  }
  ```
- Produces: `<TopLists .../>` — tabbed card with period selector

- [ ] **Step 1: Install shadcn/ui components**

```bash
npx shadcn@latest add tabs select
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/components/top-lists.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopLists } from '@/components/top-lists'
import type { Period } from '@/lib/lastfm'

const artists = [{ name: 'Radiohead', playcount: 500, rank: 1 }]
const albums = [{ name: 'OK Computer', artist: 'Radiohead', playcount: 200, rank: 1 }]
const tracks = [{ name: 'Karma Police', artist: 'Radiohead', playcount: 50, rank: 1 }]

describe('TopLists', () => {
  it('renders top artist name and playcount', () => {
    render(
      <TopLists artists={artists} albums={albums} tracks={tracks} period="7day" onPeriodChange={vi.fn()} />,
    )
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
    expect(screen.getByText('500 plays')).toBeInTheDocument()
  })

  it('shows empty state when no artists', () => {
    render(
      <TopLists artists={[]} albums={[]} tracks={[]} period="7day" onPeriodChange={vi.fn()} />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- tests/components/top-lists.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Implement components/top-lists.tsx**

```tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Period } from '@/lib/lastfm'

const PERIOD_LABELS: Record<Period, string> = {
  '7day': '7 days',
  '1month': '1 month',
  '3month': '3 months',
  '6month': '6 months',
  '12month': '12 months',
  overall: 'All time',
}

interface Item {
  name: string
  artist?: string
  playcount: number
  rank: number
}

function List({ items }: { items: Item[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-4">No data for this period.</p>
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.rank} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm text-muted-foreground w-5 shrink-0">{item.rank}</span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{item.name}</span>
              {item.artist && <span className="text-sm text-muted-foreground truncate">{item.artist}</span>}
            </div>
          </div>
          <span className="text-sm text-muted-foreground ml-4 shrink-0">
            {item.playcount.toLocaleString()} plays
          </span>
        </li>
      ))}
    </ul>
  )
}

interface TopListsProps {
  artists: { name: string; playcount: number; rank: number }[]
  albums: { name: string; artist: string; playcount: number; rank: number }[]
  tracks: { name: string; artist: string; playcount: number; rank: number }[]
  period: Period
  onPeriodChange: (p: Period) => void
}

export function TopLists({ artists, albums, tracks, period, onPeriodChange }: TopListsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Charts</CardTitle>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="artists">
          <TabsList className="mb-4">
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
          </TabsList>
          <TabsContent value="artists"><List items={artists} /></TabsContent>
          <TabsContent value="albums"><List items={albums} /></TabsContent>
          <TabsContent value="tracks"><List items={tracks} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/components/top-lists.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
rtk git add components/top-lists.tsx tests/components/top-lists.test.tsx
rtk git commit -m "feat: top artists/albums/tracks tabbed component with period selector"
```

---

### Task 12: Loved Tracks Component

**Files:**
- Create: `components/loved-tracks.tsx`
- Create: `tests/components/loved-tracks.test.tsx`

**Interfaces:**
- Consumes props: `tracks: { artist: string; track: string; lovedAt: Date }[]`
- Produces: `<LovedTracks tracks={...} />`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/components/loved-tracks.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LovedTracks } from '@/components/loved-tracks'

describe('LovedTracks', () => {
  it('renders loved tracks', () => {
    render(<LovedTracks tracks={[{ artist: 'Radiohead', track: 'Exit Music', lovedAt: new Date() }]} />)
    expect(screen.getByText('Exit Music')).toBeInTheDocument()
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<LovedTracks tracks={[]} />)
    expect(screen.getByText(/no loved tracks/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/components/loved-tracks.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement components/loved-tracks.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LovedTrack {
  artist: string
  track: string
  lovedAt: Date
}

export function LovedTracks({ tracks }: { tracks: LovedTrack[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loved Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No loved tracks yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((t, i) => (
              <li key={i} className="flex flex-col rounded-md border p-3">
                <span className="font-medium truncate">{t.track}</span>
                <span className="text-sm text-muted-foreground truncate">{t.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/components/loved-tracks.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add components/loved-tracks.tsx tests/components/loved-tracks.test.tsx
rtk git commit -m "feat: loved tracks component"
```

---

### Task 13: Stats Chart Component

**Files:**
- Create: `components/stats-chart.tsx`
- Create: `tests/components/stats-chart.test.tsx`

**Interfaces:**
- Consumes props: `scrobbles: { scrobbledAt: Date }[]`
- Produces: `<StatsChart scrobbles={...} />` — bar chart of scrobbles per day (last 30 days)

- [ ] **Step 1: Write failing tests**

```typescript
// tests/components/stats-chart.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsChart } from '@/components/stats-chart'

describe('StatsChart', () => {
  it('renders chart title with scrobble data', () => {
    const scrobbles = Array.from({ length: 5 }, (_, i) => ({
      scrobbledAt: new Date(Date.now() - i * 86400000),
    }))
    render(<StatsChart scrobbles={scrobbles} />)
    expect(screen.getByText(/scrobbles/i)).toBeInTheDocument()
  })

  it('renders empty state with no scrobbles', () => {
    render(<StatsChart scrobbles={[]} />)
    expect(screen.getByText(/no scrobble data/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/components/stats-chart.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement components/stats-chart.tsx**

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function buildData(scrobbles: { scrobbledAt: Date }[]) {
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    counts[d.toISOString().slice(0, 10)] = 0
  }
  for (const s of scrobbles) {
    const k = s.scrobbledAt.toISOString().slice(0, 10)
    if (k in counts) counts[k]++
  }
  return Object.entries(counts).map(([date, count]) => ({ date: date.slice(5), count }))
}

export function StatsChart({ scrobbles }: { scrobbles: { scrobbledAt: Date }[] }) {
  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Scrobbles</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No scrobble data yet.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Scrobbles (last 30 days)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={buildData(scrobbles)}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/components/stats-chart.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
rtk git add components/stats-chart.tsx tests/components/stats-chart.test.tsx
rtk git commit -m "feat: scrobbles-over-time bar chart using Recharts"
```

---

### Task 14: UserProfile Composite Component

**Files:**
- Create: `components/user-profile.tsx`
- Create: `tests/components/user-profile.test.tsx`

**Interfaces:**
- Consumes props:
  ```typescript
  {
    username: string
    totalScrobbles: number
    registeredAt: Date
    imageUrl: string
    lastSyncedAt: Date | null
    isOwner: boolean
    recentTracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]
    topArtists: Record<Period, { name: string; playcount: number; rank: number }[]>
    topAlbums: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
    topTracks: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
    lovedTracks: { artist: string; track: string; lovedAt: Date }[]
    allScrobbles: { scrobbledAt: Date }[]
  }
  ```
- Produces: `<UserProfile .../>` — full profile assembled from Tasks 9–13

- [ ] **Step 1: Install shadcn/ui components**

```bash
npx shadcn@latest add avatar
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/components/user-profile.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

const periods = ['7day', '1month', '3month', '6month', '12month', 'overall'] as Period[]
const empty = Object.fromEntries(periods.map((p) => [p, []])) as Record<Period, never[]>

describe('UserProfile', () => {
  it('renders username and scrobble count in header', () => {
    render(
      <UserProfile
        username="testuser"
        totalScrobbles={1234}
        registeredAt={new Date('2020-01-01')}
        imageUrl=""
        lastSyncedAt={null}
        isOwner={false}
        recentTracks={[]}
        topArtists={empty}
        topAlbums={empty}
        topTracks={empty}
        lovedTracks={[]}
        allScrobbles={[]}
      />,
    )
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText(/1,234 scrobbles/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- tests/components/user-profile.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Implement components/user-profile.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SyncStatus } from '@/components/sync-status'
import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import type { Period } from '@/lib/lastfm'

interface UserProfileProps {
  username: string
  totalScrobbles: number
  registeredAt: Date
  imageUrl: string
  lastSyncedAt: Date | null
  isOwner: boolean
  recentTracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]
  topArtists: Record<Period, { name: string; playcount: number; rank: number }[]>
  topAlbums: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  topTracks: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  lovedTracks: { artist: string; track: string; lovedAt: Date }[]
  allScrobbles: { scrobbledAt: Date }[]
}

export function UserProfile({
  username, totalScrobbles, registeredAt, imageUrl, lastSyncedAt, isOwner,
  recentTracks, topArtists, topAlbums, topTracks, lovedTracks, allScrobbles,
}: UserProfileProps) {
  const [period, setPeriod] = useState<Period>('7day')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={imageUrl} alt={username} />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{username}</h1>
          <p className="text-muted-foreground text-sm">
            {totalScrobbles.toLocaleString()} scrobbles · Member since{' '}
            {registeredAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <SyncStatus lastSyncedAt={lastSyncedAt} isOwner={isOwner} />
      </div>

      <div className="grid gap-6">
        <StatsChart scrobbles={allScrobbles} />
        <TopLists
          artists={topArtists[period]}
          albums={topAlbums[period]}
          tracks={topTracks[period]}
          period={period}
          onPeriodChange={setPeriod}
        />
        <div className="grid md:grid-cols-2 gap-6">
          <RecentTracks tracks={recentTracks} />
          <LovedTracks tracks={lovedTracks} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/components/user-profile.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
rtk git add components/user-profile.tsx tests/components/user-profile.test.tsx
rtk git commit -m "feat: UserProfile composite component assembling all dashboard sections"
```

---

### Task 15: Landing Page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getSession()` from `@/lib/session`, `SearchForm` from `@/components/search-form`
- Produces: `/` — hero with search bar and conditional sign-in CTA

- [ ] **Step 1: Implement app/page.tsx**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchForm } from '@/components/search-form'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Last.fm Advanced</h1>
        <p className="text-muted-foreground max-w-md">
          Deep analytics for your Last.fm listening history — stored locally, always fast.
        </p>
      </div>
      <SearchForm />
      {!session && (
        <Link href="/login">
          <Button variant="outline">Sign in to track your own stats</Button>
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000` — landing page renders. Type a username and submit — navigates to `/user/[username]` (404 expected at this stage).

- [ ] **Step 3: Commit**

```bash
rtk git add app/page.tsx
rtk git commit -m "feat: landing page with username search"
```

---

### Task 16: Dashboard Page

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getSession()`, Prisma queries for authenticated user
- Produces: `/dashboard` — renders `<UserProfile isOwner={true}>` with authenticated user's data; triggers initial sync on first visit

- [ ] **Step 1: Implement app/dashboard/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const

function groupByPeriod<T extends { period: string }>(items: T[]): Record<Period, T[]> {
  return Object.fromEntries(
    PERIODS.map((p) => [p, items.filter((i) => i.period === p)]),
  ) as Record<Period, T[]>
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      scrobbles: { orderBy: { scrobbledAt: 'desc' }, take: 50 },
      topArtists: true,
      topAlbums: true,
      topTracks: true,
      lovedTracks: { orderBy: { lovedAt: 'desc' }, take: 100 },
    },
  })

  if (!user) redirect('/login')

  if (!user.lastSyncedAt) {
    await syncUser(user.lastfmUsername)
    redirect('/dashboard')
  }

  const userInfo = await lastfmClient.getUserInfo(user.lastfmUsername).catch(() => null)

  return (
    <UserProfile
      username={user.lastfmUsername}
      totalScrobbles={userInfo?.playcount ?? user.scrobbles.length}
      registeredAt={userInfo?.registered ?? user.createdAt}
      imageUrl={userInfo?.imageUrl ?? ''}
      lastSyncedAt={user.lastSyncedAt}
      isOwner={true}
      recentTracks={user.scrobbles.map((s) => ({
        artist: s.artist,
        album: s.album,
        track: s.track,
        scrobbledAt: s.scrobbledAt,
      }))}
      topArtists={groupByPeriod(user.topArtists)}
      topAlbums={groupByPeriod(user.topAlbums)}
      topTracks={groupByPeriod(user.topTracks)}
      lovedTracks={user.lovedTracks.map((l) => ({ artist: l.artist, track: l.track, lovedAt: l.lovedAt }))}
      allScrobbles={user.scrobbles.map((s) => ({ scrobbledAt: s.scrobbledAt }))}
    />
  )
}
```

- [ ] **Step 2: End-to-end verify**

With real Last.fm API keys in `.env`:
1. `npm run docker:up && npm run db:migrate`
2. `npm run dev`
3. Go to `http://localhost:3000/login` → Sign in with Last.fm
4. Should redirect to `/dashboard` — first visit triggers sync (may take ~10s), then renders profile

- [ ] **Step 3: Commit**

```bash
rtk git add app/dashboard/page.tsx
rtk git commit -m "feat: authenticated dashboard page with initial sync on first visit"
```

---

### Task 17: Public Profile Page

**Files:**
- Create: `app/user/[username]/page.tsx`

**Interfaces:**
- Consumes: `params: Promise<{ username: string }>`, `getSession()`, Prisma, on-demand sync for unknown users
- Produces: `/user/[username]` — public read-only profile; `isOwner=true` if viewer owns the profile

- [ ] **Step 1: Implement app/user/[username]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

type Props = { params: Promise<{ username: string }> }

const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const

function groupByPeriod<T extends { period: string }>(items: T[]): Record<Period, T[]> {
  return Object.fromEntries(
    PERIODS.map((p) => [p, items.filter((i) => i.period === p)]),
  ) as Record<Period, T[]>
}

const INCLUDE = {
  scrobbles: { orderBy: { scrobbledAt: 'desc' } as const, take: 50 },
  topArtists: true,
  topAlbums: true,
  topTracks: true,
  lovedTracks: { orderBy: { lovedAt: 'desc' } as const, take: 100 },
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Last.fm Advanced` }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const session = await getSession()

  let user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })

  if (!user) {
    try {
      await lastfmClient.getUserInfo(username)
      await prisma.user.create({ data: { lastfmUsername: username, sessionKey: '' } })
      await syncUser(username)
    } catch {
      notFound()
    }
    user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })
    if (!user) notFound()
  }

  const userInfo = await lastfmClient.getUserInfo(username).catch(() => null)
  const isOwner = session?.lastfmUsername === username

  return (
    <UserProfile
      username={user.lastfmUsername}
      totalScrobbles={userInfo?.playcount ?? user.scrobbles.length}
      registeredAt={userInfo?.registered ?? user.createdAt}
      imageUrl={userInfo?.imageUrl ?? ''}
      lastSyncedAt={user.lastSyncedAt}
      isOwner={isOwner}
      recentTracks={user.scrobbles.map((s) => ({
        artist: s.artist,
        album: s.album,
        track: s.track,
        scrobbledAt: s.scrobbledAt,
      }))}
      topArtists={groupByPeriod(user.topArtists)}
      topAlbums={groupByPeriod(user.topAlbums)}
      topTracks={groupByPeriod(user.topTracks)}
      lovedTracks={user.lovedTracks.map((l) => ({ artist: l.artist, track: l.track, lovedAt: l.lovedAt }))}
      allScrobbles={user.scrobbles.map((s) => ({ scrobbledAt: s.scrobbledAt }))}
    />
  )
}
```

- [ ] **Step 2: Verify public profile works**

With dev server running:
1. Go to `http://localhost:3000/user/[any-valid-lastfm-username]`
2. First visit triggers on-demand sync (loading for a few seconds)
3. Profile renders with full data
4. Sign in and visit your own profile — sync button should appear

- [ ] **Step 3: Commit**

```bash
rtk git add app/user/
rtk git commit -m "feat: public profile page with on-demand sync for new users"
```

---

## All Tasks Complete

Run the full test suite:
```bash
npm test
```

Run the full app:
```bash
# Terminal 1
npm run docker:up && npm run db:migrate && npm run dev

# Terminal 2
npm run worker:dev
```
