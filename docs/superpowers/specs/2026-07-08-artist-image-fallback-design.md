# Artist Image Fallback & Caching — Design

## Context

`app/api/artist-image/route.ts` already resolves artist images through a fallback chain (Last.fm → Wikipedia exact title → Wikipedia fuzzy search → Wikidata), each tier added in a previous session specifically to improve hit rate. Despite that, artists are still frequently missing images. Root cause: the route has **no persistent, server-side cache** — every request re-runs the entire fallback chain from scratch — and the only caching that exists is an HTTP `Cache-Control` header (`public, max-age=3600` on a miss). Because that header applies to the whole route response, a single transient failure (e.g. a Wikimedia 429 during a burst of concurrent `<ArtistImage>` renders on a page with dozens of artists) gets cached as "no image" for a full hour, for every subsequent request for that artist during that window. There is no hosting/CDN layer in this project (local dev on port 4000, `next start` for local prod) — this is purely the requesting browser's own HTTP cache reintroducing stale nulls on repeat visits.

## Goals

- A resolved image is remembered permanently (no re-fetching on every request).
- A failed lookup is only remembered briefly (10 minutes), so a transient rate-limit or network blip self-heals on the next page load instead of sticking for an hour.
- Add Deezer as an additional fallback tier — a keyless, artist-photo-focused API, which should out-perform the existing Wikipedia/Wikidata tiers for less-famous artists that don't have a substantial Wikipedia presence.

## Non-goals

- No MusicBrainz/Cover Art Archive or Spotify integration (considered, declined — MusicBrainz is release-art-oriented not artist-portrait-oriented, and Spotify requires OAuth credential setup).
- No background revalidation of already-resolved images (e.g. periodically re-checking for a better/updated photo). A resolved URL is treated as good indefinitely, matching the explicit "dauerhaft" (permanent) choice made for this feature. Revisiting stale/dead image links is out of scope.
- No change to the client-side `imageCache` Map in `components/artist-image.tsx` (its per-session de-dupe behavior is orthogonal and already correct).

## Data model

New Prisma model:

```prisma
model ArtistImageCache {
  id         String   @id @default(cuid())
  artistKey  String   @unique
  imageUrl   String?
  source     String?
  resolvedAt DateTime @default(now())
}
```

- `artistKey`: the artist name normalized via `.trim().toLowerCase()`, used as the lookup/uniqueness key (so "The Beatles" and "the beatles" share one cache entry).
- `imageUrl`: `null` means "confirmed no image found across all sources."
- `source`: which tier resolved it (`'lastfm' | 'deezer' | 'wikipedia-exact' | 'wikipedia-search' | 'wikidata' | null`), kept for future debugging/observability — not otherwise consumed by application logic.
- `resolvedAt`: used to compute whether a `null` result has aged past the 10-minute retry window; irrelevant once `imageUrl` is non-null (permanent).

Migration: plain `CREATE TABLE`, no backfill needed (empty table on deploy; first request per artist populates it).

## Route logic (`app/api/artist-image/route.ts`)

```
1. normalize incoming `name` → artistKey
2. look up ArtistImageCache by artistKey
3. if found AND (imageUrl is not null OR resolvedAt is within last 10 minutes):
     return the cached imageUrl as-is (no external requests)
4. otherwise (no row, or a null row older than 10 minutes):
     run the fallback chain: fromLastfm → fromDeezer → fromWikipedia (exact → search) → fromWikidata
     upsert the ArtistImageCache row with the result (imageUrl + source, resolvedAt = now)
5. return the resolved imageUrl (or null)
```

This upsert-then-serve logic replaces reliance on the HTTP-level cache as the source of truth. The route's own `Cache-Control` response header shrinks accordingly — it no longer needs to hide staleness, since the DB now self-expires failures on its own 10-minute schedule:

```ts
const CACHE = { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } } // unchanged: hits are permanent, long browser cache is safe
const CACHE_MISS = { headers: { 'Cache-Control': 'public, max-age=60' } } // was max-age=3600 — DB now owns the real retry window
```

### `fromDeezer` (new fetcher)

```ts
async function fromDeezer(name: string): Promise<string | null> {
  try {
    const res = await throttledFetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`,
      { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const artists: Array<{ name: string; picture_xl?: string }> = data?.data ?? []
    for (const artist of artists) {
      if (artist.picture_xl && !isDeezerPlaceholder(artist.picture_xl)) {
        return artist.picture_xl
      }
    }
  } catch {}
  return null
}
```

Deezer serves a default/placeholder avatar image for artists it has no photo for, analogous to Last.fm's `PLACEHOLDER` hash. The exact placeholder URL/filename pattern needs to be captured empirically during implementation (call the search endpoint for a deliberately nonsense artist name, inspect the returned `picture_xl`, and hardcode that pattern into `isDeezerPlaceholder`, mirroring the existing `PLACEHOLDER` constant check for Last.fm).

Deezer is routed through the same `throttledFetch` queue as the Wikimedia calls, since it's a third-party API subject to the same anonymous-traffic rate-limit concerns.

### Updated resolution order

```ts
const url = (await fromLastfm(name))
  ?? (await fromDeezer(name))
  ?? (await fromWikipedia(name))
  ?? (await fromWikidata(name))
```

Deezer sits second — same tier as Last.fm (a dedicated music-artist source), ahead of the more general-purpose encyclopedic fallbacks.

## Testing

- Unit tests for the cache-lookup branch: a fresh `artistKey` with no row falls through to the fetch chain and upserts; a row with a non-null `imageUrl` short-circuits with zero fetch calls; a row with `imageUrl: null` and `resolvedAt` 11 minutes ago falls through and retries; a row with `imageUrl: null` and `resolvedAt` 1 minute ago short-circuits and returns `null` without retrying.
- Unit test for `isDeezerPlaceholder` once its real pattern is captured.
- Manual verification (dev server, port 4000): pick 2-3 artists currently showing no image, confirm at least one now resolves via Deezer; confirm the DB row appears in `ArtistImageCache` after the first request and a second request for the same artist does not re-hit any external API (verifiable via a temporary log line or network tab during manual testing).
- `npx tsc --noEmit` clean; full `npx vitest run` (excluding stale `.claude/worktrees/*`) shows no new failures beyond the known pre-existing ones.
