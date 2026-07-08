# Artist Image Fallback & Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop transient image-lookup failures from sticking as "no image" for an hour, and add Deezer as a new fallback source so fewer artists end up with no image at all.

**Architecture:** A new `ArtistImageCache` Prisma table becomes the single source of truth for `app/api/artist-image/route.ts`. A resolved image is cached forever; a failed lookup is only trusted for 10 minutes before the route retries the full fallback chain. Deezer's keyless artist-search endpoint is added as a new fallback tier between Last.fm and Wikipedia.

**Tech Stack:** Next.js route handler (Node runtime), Prisma 7 + Postgres, Vitest + `vi.stubGlobal('fetch', ...)`.

## Global Constraints

- Dev server runs on port 4000 (`npm run dev` → `next dev -p 4000`); this repo has no CDN/hosting layer configured, so the route's own `Cache-Control` header and the `ArtistImageCache` table are the only caching layers that matter.
- Full test suite command: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next` (this repo has stale leftover git-worktree directories under `.claude/worktrees/` that pollute Vitest's default glob).
- Deezer's default "no photo" placeholder image always uses the fixed hash `d41d8cd98f00b204e9800998ecf8427e` in its URL path (verified live against `https://api.deezer.com/search/artist` — a real artist's `picture_xl` uses a unique per-artist hash; the empty-hash URL resolves to a smaller, generic silhouette image). Any `picture_xl` containing this substring must be treated the same as "no image," exactly like the existing `PLACEHOLDER` constant for Last.fm.
- The "failure retry window" is exactly 10 minutes (`10 * 60 * 1000` ms). A resolved (non-null) image has no expiry.
- Artist cache keys are normalized via `name.trim().toLowerCase()` before every lookup/write, so casing differences (`"Radiohead"` vs `"radiohead"`) share one row.

---

### Task 1: `ArtistImageCache` data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260708120000_add_artist_image_cache/migration.sql`

**Interfaces:**
- Produces: Prisma model `ArtistImageCache` with fields `id: String`, `artistKey: String` (unique), `imageUrl: String?`, `source: String?`, `resolvedAt: DateTime` (defaults to now). Task 2 reads/writes this via `prisma.artistImageCache.findUnique({ where: { artistKey } })` and `prisma.artistImageCache.upsert(...)`.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Add this model after the existing `User` model (anywhere at the top level of the file is valid Prisma; placing it after `User` keeps related models grouped):

```prisma
model ArtistImageCache {
  id         String   @id @default(cuid())
  artistKey  String   @unique
  imageUrl   String?
  source     String?
  resolvedAt DateTime @default(now())
}
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260708120000_add_artist_image_cache/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "ArtistImageCache" (
    "id" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "source" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistImageCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistImageCache_artistKey_key" ON "ArtistImageCache"("artistKey");
```

- [ ] **Step 3: Apply the migration and regenerate the client**

Run: `npx prisma migrate deploy`
Expected: `The following migration(s) have been applied: ... 20260708120000_add_artist_image_cache`

Run: `npx prisma generate`
Expected: completes with no errors (regenerates `lib/generated/prisma`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260708120000_add_artist_image_cache
git commit -m "feat: add ArtistImageCache model for persistent artist-image lookups"
```

---

### Task 2: Cache-backed route logic + Deezer fallback

**Files:**
- Modify: `app/api/artist-image/route.ts`
- Create: `tests/api/artist-image.test.ts`

**Interfaces:**
- Consumes: `prisma.artistImageCache.findUnique`/`.upsert` from Task 1's model (via `@/lib/prisma`'s existing `prisma` export).
- Produces: `GET(req: Request)` route handler behavior unchanged from the caller's perspective (`{ url: string | null }` JSON body) — only its internal caching and source order change. No other file in the codebase imports from `app/api/artist-image/route.ts` directly (it's called over HTTP by `components/artist-image.tsx`), so no other files need updating.

- [ ] **Step 1: Write the failing tests**

Create `tests/api/artist-image.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    artistImageCache: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

function makeRequest(name: string): Request {
  return new Request(`http://localhost/api/artist-image?name=${encodeURIComponent(name)}`)
}

describe('GET /api/artist-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('resolves via Last.fm and creates a cache row when no row exists', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artist: { image: [{ '#text': 'https://lastfm.example/img.jpg', size: 'mega' }] },
      }),
    } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Radiohead'))
    const body = await res.json()

    expect(body.url).toBe('https://lastfm.example/img.jpg')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(prisma.artistImageCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { artistKey: 'radiohead' },
        create: expect.objectContaining({
          artistKey: 'radiohead',
          imageUrl: 'https://lastfm.example/img.jpg',
          source: 'lastfm',
        }),
      }),
    )
  })

  it('returns a cached image without calling any external API', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'radiohead',
      imageUrl: 'https://cached.example/img.jpg',
      source: 'lastfm',
      resolvedAt: new Date(),
    } as never)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Radiohead'))
    const body = await res.json()

    expect(body.url).toBe('https://cached.example/img.jpg')
    expect(fetch).not.toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).not.toHaveBeenCalled()
  })

  it('retries external sources when a null cache row is older than 10 minutes', async () => {
    const { prisma } = await import('@/lib/prisma')
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'obscure artist',
      imageUrl: null,
      source: null,
      resolvedAt: elevenMinutesAgo,
    } as never)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Obscure Artist'))
    const body = await res.json()

    expect(body.url).toBeNull()
    expect(fetch).toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { artistKey: 'obscure artist' } }),
    )
  })

  it('does not retry external sources when a null cache row is fresh', async () => {
    const { prisma } = await import('@/lib/prisma')
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'obscure artist',
      imageUrl: null,
      source: null,
      resolvedAt: oneMinuteAgo,
    } as never)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Obscure Artist'))
    const body = await res.json()

    expect(body.url).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).not.toHaveBeenCalled()
  })

  it("falls back to Deezer and skips Deezer's default placeholder image", async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ artist: { image: [] } }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { picture_xl: 'https://cdn-images.dzcdn.net/images/artist/d41d8cd98f00b204e9800998ecf8427e/1000x1000-000000-80-0-0.jpg' },
            { picture_xl: 'https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg' },
          ],
        }),
      } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Niche Artist'))
    const body = await res.json()

    expect(body.url).toBe('https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/api/artist-image.test.ts`
Expected: FAIL — `prisma.artistImageCache` does not exist on the mocked module / route doesn't import `prisma` yet / Deezer fallback doesn't exist yet.

- [ ] **Step 3: Rewrite `app/api/artist-image/route.ts`**

Replace the full file with:

```ts
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
const DEEZER_PLACEHOLDER = 'd41d8cd98f00b204e9800998ecf8427e'
const CACHE = { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } }
const CACHE_MISS = { headers: { 'Cache-Control': 'public, max-age=60' } }
const FAILURE_RETRY_MS = 10 * 60 * 1000

// Wikimedia's API etiquette policy requires a descriptive User-Agent identifying
// the application; requests without one are throttled/rejected more aggressively.
const USER_AGENT = 'LastFmAdvanced/1.0 (educational/personal project)'

const MUSIC_KEYWORDS = [
  'musician',
  'singer',
  'band',
  'rapper',
  'musical group',
  'composer',
  'songwriter',
  'dj',
  'rock band',
  'music duo',
  'record producer',
  'vocalist',
  'recording artist',
]

interface WikipediaPage {
  thumbnail?: { source: string }
  pageprops?: { disambiguation?: string }
  index?: number
}

// Pages like the leaderboard/top-lists render dozens of <ArtistImage> at once,
// each firing an independent request. Wikimedia's anonymous-traffic rate limit
// is tight enough that a burst of that size reliably triggers 429s, which the
// catch-blocks below turn into silent misses. Serializing all Wikimedia-bound
// (and Deezer-bound) requests through one queue (with a small minimum gap
// between request starts) keeps a single page load well under the limit
// without meaningfully slowing down any individual avatar (they already
// render behind a loading shimmer).
let wikimediaQueue: Promise<unknown> = Promise.resolve()
const WIKIMEDIA_MIN_INTERVAL_MS = 120

function throttledFetch(url: string, init: RequestInit): Promise<Response> {
  const result = wikimediaQueue.then(() => fetch(url, init))
  wikimediaQueue = result.catch(() => {}).then(() => new Promise((resolve) => setTimeout(resolve, WIKIMEDIA_MIN_INTERVAL_MS)))
  return result
}

async function fromLastfm(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${process.env.LASTFM_API_KEY}&format=json`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const images: Array<{ '#text': string; size: string }> = data?.artist?.image ?? []
    for (const size of ['mega', 'extralarge', 'large']) {
      const img = images.find((i) => i.size === size)
      if (img?.['#text'] && !img['#text'].includes(PLACEHOLDER) && img['#text'].length > 10) {
        return img['#text']
      }
    }
  } catch {}
  return null
}

// Deezer's keyless artist-search endpoint, purpose-built for artist portraits
// (unlike Wikipedia/Wikidata, which are general-purpose encyclopedic sources).
// Deezer serves a fixed placeholder image (hash `d41d8cd98f00b204e9800998ecf8427e`)
// for artists it has no photo for — verified live against the API, this hash
// is identical across every artist lacking a real picture, the same way
// Last.fm's PLACEHOLDER hash is.
async function fromDeezer(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: name, limit: '5' })
    const res = await throttledFetch(`https://api.deezer.com/search/artist?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const artists: Array<{ picture_xl?: string }> = data?.data ?? []
    for (const artist of artists) {
      if (artist.picture_xl && !artist.picture_xl.includes(DEEZER_PLACEHOLDER)) {
        return artist.picture_xl
      }
    }
  } catch {}
  return null
}

// Direct, exact page-title lookup. Fast and works whenever the artist name
// matches the Wikipedia article title exactly (the common case), but fails
// for anything phrased differently than the article title (missing "The",
// different punctuation/casing, disambiguated titles like "Chicago (band)",
// non-English romanizations, etc).
async function fromWikipediaExact(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: name,
      prop: 'pageimages',
      pithumbsize: '600',
      pilimit: '1',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const res = await throttledFetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages: WikipediaPage[] = data?.query?.pages ?? []
    return pages[0]?.thumbnail?.source ?? null
  } catch {}
  return null
}

// Fuzzy fallback using MediaWiki's full-text search (generator=search) instead
// of an exact title match. This resolves cases the exact lookup misses, and
// explicitly skips disambiguation pages (e.g. searching "Chicago" or "Genesis"
// would otherwise land on a disambiguation page with no image) in favor of the
// next best-ranked candidate that actually has a thumbnail.
async function fromWikipediaSearch(name: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: name,
      gsrlimit: '5',
      prop: 'pageimages|pageprops',
      pithumbsize: '600',
      ppprop: 'disambiguation',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const res = await throttledFetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages: WikipediaPage[] = data?.query?.pages ?? []
    const ranked = [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    for (const page of ranked) {
      if (page.pageprops?.disambiguation) continue
      if (page.thumbnail?.source) return page.thumbnail.source
    }
  } catch {}
  return null
}

// Last-resort fallback: Wikidata, which models artists/bands as structured
// entities with a dedicated P18 "image" property and its own fuzzy entity
// search, independent of Wikipedia's page-title/full-text index. Useful for
// niche artists that have a Wikidata item (often with a Commons image) but no
// (or a thin, imageless) English Wikipedia article.
async function fromWikidata(name: string): Promise<string | null> {
  try {
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: name,
      language: 'en',
      type: 'item',
      limit: '5',
      format: 'json',
      origin: '*',
    })
    const searchRes = await throttledFetch(`https://www.wikidata.org/w/api.php?${searchParams}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const candidates: Array<{ id: string; description?: string }> = searchData?.search ?? []
    if (!candidates.length) return null

    // Fetch claims for every candidate in a single batched request (Wikidata
    // allows pipe-separated ids) instead of one request per candidate.
    const entityParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: candidates.map((c) => c.id).join('|'),
      props: 'claims',
      format: 'json',
      origin: '*',
    })
    const entityRes = await throttledFetch(`https://www.wikidata.org/w/api.php?${entityParams}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 },
    })
    if (!entityRes.ok) return null
    const entityData = await entityRes.json()
    const entities: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string } } }>> }> =
      entityData?.entities ?? {}

    // Prefer candidates whose description reads like a musician/band, but
    // still fall back to the remaining candidates in original rank order.
    const isMusical = (c: { description?: string }) =>
      !!c.description && MUSIC_KEYWORDS.some((k) => c.description!.toLowerCase().includes(k))
    const ranked = [...candidates.filter(isMusical), ...candidates.filter((c) => !isMusical(c))]

    for (const candidate of ranked) {
      const filename = entities[candidate.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (filename) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=600`
      }
    }
  } catch {}
  return null
}

function normalizeArtistKey(name: string): string {
  return name.trim().toLowerCase()
}

async function resolveArtistImage(name: string): Promise<{ url: string | null; source: string | null }> {
  const attempts: Array<[string, () => Promise<string | null>]> = [
    ['lastfm', () => fromLastfm(name)],
    ['deezer', () => fromDeezer(name)],
    ['wikipedia-exact', () => fromWikipediaExact(name)],
    ['wikipedia-search', () => fromWikipediaSearch(name)],
    ['wikidata', () => fromWikidata(name)],
  ]
  for (const [source, attempt] of attempts) {
    const url = await attempt()
    if (url) return { url, source }
  }
  return { url: null, source: null }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) return Response.json({ url: null }, { status: 400 })

  const artistKey = normalizeArtistKey(name)
  const cached = await prisma.artistImageCache.findUnique({ where: { artistKey } })

  if (cached) {
    const isStaleFailure = cached.imageUrl === null && Date.now() - cached.resolvedAt.getTime() > FAILURE_RETRY_MS
    if (!isStaleFailure) {
      return Response.json({ url: cached.imageUrl }, cached.imageUrl ? CACHE : CACHE_MISS)
    }
  }

  const { url, source } = await resolveArtistImage(name)

  await prisma.artistImageCache.upsert({
    where: { artistKey },
    create: { artistKey, imageUrl: url, source },
    update: { imageUrl: url, source, resolvedAt: new Date() },
  })

  return Response.json({ url }, url ? CACHE : CACHE_MISS)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/api/artist-image.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add app/api/artist-image/route.ts tests/api/artist-image.test.ts
git commit -m "feat: persist artist-image lookups and add Deezer fallback tier"
```

---

### Task 3: Verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 3: Manual verification**

With the dev server running on port 4000 (`npm run dev`), pick 2-3 artists that currently show no image on the dashboard. Reload their page and confirm at least one now resolves an image. Check the `ArtistImageCache` table (e.g. via `npx prisma studio`) to confirm a row was created for each artist requested, and that reloading the same page again does not change `resolvedAt` for artists that already resolved to a non-null `imageUrl`.

- [ ] **Step 4: Build**

Run: `npx next build`
Expected: succeeds across all routes.
