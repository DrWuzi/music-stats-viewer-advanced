export const runtime = 'nodejs'

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' }
const CACHE_MISS_HEADERS = { 'Cache-Control': 'public, max-age=3600' }

type LastfmImage = { '#text': string; size: string }

function isValidImage(url: string): boolean {
  return url.length > 10 && !url.includes(PLACEHOLDER)
}

function bestImageFromLastfm(images: LastfmImage[]): string | null {
  for (const size of ['mega', 'extralarge', 'large', 'medium']) {
    const img = images.find((i) => i.size === size)
    if (img?.['#text'] && isValidImage(img['#text'])) {
      return img['#text']
    }
  }
  return null
}

// ── Artist: Wikipedia MediaWiki ───────────────────────────────────────────────

async function artistImageFromWikipedia(name: string): Promise<string | null> {
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
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'LastFmAdvanced/1.0 (educational/personal project)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages: Array<{ thumbnail?: { source: string } }> = data?.query?.pages ?? []
    return pages[0]?.thumbnail?.source ?? null
  } catch {
    return null
  }
}

// ── Album: Last.fm ────────────────────────────────────────────────────────────

async function albumImageFromLastfm(artist: string, name: string): Promise<string | null> {
  try {
    const u = new URL('https://ws.audioscrobbler.com/2.0/')
    u.searchParams.set('method', 'album.getinfo')
    u.searchParams.set('artist', artist)
    u.searchParams.set('album', name)
    u.searchParams.set('api_key', process.env.LASTFM_API_KEY!)
    u.searchParams.set('format', 'json')
    const res = await fetch(u.toString(), { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error || !data.album) return null
    return bestImageFromLastfm(data.album.image ?? [])
  } catch {
    return null
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const name = searchParams.get('name')
  const artist = searchParams.get('artist')

  if (!type || !name) {
    return Response.json(
      { error: 'type and name are required' },
      { status: 400, headers: CACHE_MISS_HEADERS },
    )
  }

  let url: string | null = null

  if (type === 'artist') {
    url = await artistImageFromWikipedia(name)
  } else if (type === 'album') {
    if (!artist) {
      return Response.json(
        { error: 'artist is required for type=album' },
        { status: 400, headers: CACHE_MISS_HEADERS },
      )
    }
    url = await albumImageFromLastfm(artist, name)
  } else {
    return Response.json(
      { error: `Unknown type: ${type}` },
      { status: 400, headers: CACHE_MISS_HEADERS },
    )
  }

  return Response.json({ url }, { headers: url ? CACHE_HEADERS : CACHE_MISS_HEADERS })
}
