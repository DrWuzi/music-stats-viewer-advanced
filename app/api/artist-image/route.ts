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
  let cached: Awaited<ReturnType<typeof prisma.artistImageCache.findUnique>> = null
  try {
    cached = await prisma.artistImageCache.findUnique({ where: { artistKey } })
  } catch {
    // DB unavailable/slow: treat as a cache miss and fall through to a live resolve.
  }

  if (cached) {
    const isStaleFailure = cached.imageUrl === null && Date.now() - cached.resolvedAt.getTime() > FAILURE_RETRY_MS
    if (!isStaleFailure) {
      return Response.json({ url: cached.imageUrl }, cached.imageUrl ? CACHE : CACHE_MISS)
    }
  }

  const { url, source } = await resolveArtistImage(name)

  try {
    await prisma.artistImageCache.upsert({
      where: { artistKey },
      create: { artistKey, imageUrl: url, source },
      update: { imageUrl: url, source, resolvedAt: new Date() },
    })
  } catch {
    // Best-effort persistence: don't fail the request if the write fails.
  }

  return Response.json({ url }, url ? CACHE : CACHE_MISS)
}
