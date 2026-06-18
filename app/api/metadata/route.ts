export const runtime = 'nodejs'

const BASE = 'https://ws.audioscrobbler.com/2.0/'
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' }
const ERROR_CACHE_HEADERS = { 'Cache-Control': 'public, max-age=300' }

function lfmUrl(params: Record<string, string>): string {
  const u = new URL(BASE)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  u.searchParams.set('api_key', process.env.LASTFM_API_KEY!)
  u.searchParams.set('format', 'json')
  return u.toString()
}

// ── Artist ────────────────────────────────────────────────────────────────────

type LastfmImage = { '#text': string; size: string }

interface ArtistResult {
  name: string
  url: string
  bio: { summary: string; content: string }
  stats: { listeners: string; playcount: string }
  tags: string[]
  similar: string[]
  images: LastfmImage[]
}

async function getArtist(name: string): Promise<ArtistResult | null> {
  const res = await fetch(lfmUrl({ method: 'artist.getinfo', artist: name }), {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error || !data.artist) return null
  const a = data.artist
  return {
    name: a.name ?? name,
    url: a.url ?? '',
    bio: {
      summary: a.bio?.summary ?? '',
      content: a.bio?.content ?? '',
    },
    stats: {
      listeners: a.stats?.listeners ?? '0',
      playcount: a.stats?.playcount ?? '0',
    },
    tags: (a.tags?.tag ?? []).map((t: { name: string }) => t.name),
    similar: (a.similar?.artist ?? []).map((s: { name: string }) => s.name),
    images: a.image ?? [],
  }
}

// ── Album ─────────────────────────────────────────────────────────────────────

interface AlbumResult {
  name: string
  artist: string
  url: string
  releaseDate: string
  stats: { listeners: string; playcount: string }
  tags: string[]
  tracks: Array<{ name: string; duration: string; rank: number }>
  images: LastfmImage[]
}

async function getAlbum(artist: string, name: string): Promise<AlbumResult | null> {
  const res = await fetch(lfmUrl({ method: 'album.getinfo', artist, album: name }), {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error || !data.album) return null
  const al = data.album
  const tracks: Array<{ name: string; duration: string; '@attr': { rank: string } }> =
    al.tracks?.track ?? []
  return {
    name: al.name ?? name,
    artist: al.artist ?? artist,
    url: al.url ?? '',
    releaseDate: al.releasedate ?? '',
    stats: {
      listeners: al.listeners ?? '0',
      playcount: al.playcount ?? '0',
    },
    tags: (al.tags?.tag ?? []).map((t: { name: string }) => t.name),
    tracks: tracks.map((t) => ({
      name: t.name,
      duration: t.duration,
      rank: parseInt(t['@attr']?.rank ?? '0', 10),
    })),
    images: al.image ?? [],
  }
}

// ── Track ─────────────────────────────────────────────────────────────────────

interface TrackResult {
  name: string
  artist: string
  album: string
  url: string
  duration: string
  stats: { listeners: string; playcount: string }
  tags: string[]
}

async function getTrack(artist: string, name: string): Promise<TrackResult | null> {
  const res = await fetch(lfmUrl({ method: 'track.getinfo', artist, track: name }), {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error || !data.track) return null
  const t = data.track
  return {
    name: t.name ?? name,
    artist: typeof t.artist === 'string' ? t.artist : (t.artist?.name ?? artist),
    album: t.album?.title ?? '',
    url: t.url ?? '',
    duration: t.duration ?? '0',
    stats: {
      listeners: t.listeners ?? '0',
      playcount: t.playcount ?? '0',
    },
    tags: (t.toptags?.tag ?? []).map((tag: { name: string }) => tag.name),
  }
}

// ── Tag ───────────────────────────────────────────────────────────────────────

interface TagResult {
  name: string
  url: string
  reach: string
  taggings: string
  wiki: { summary: string; content: string }
}

async function getTag(name: string): Promise<TagResult | null> {
  const res = await fetch(lfmUrl({ method: 'tag.getinfo', tag: name }), {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.error || !data.tag) return null
  const t = data.tag
  return {
    name: t.name ?? name,
    url: t.url ?? '',
    reach: t.reach ?? '0',
    taggings: t.taggings ?? '0',
    wiki: {
      summary: t.wiki?.summary ?? '',
      content: t.wiki?.content ?? '',
    },
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const name = searchParams.get('name')
  const artist = searchParams.get('artist')

  if (!type) {
    return Response.json({ error: 'type is required' }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }

  switch (type) {
    case 'artist': {
      if (!name) {
        return Response.json({ error: 'name is required for type=artist' }, { status: 400, headers: ERROR_CACHE_HEADERS })
      }
      const result = await getArtist(name)
      if (!result) {
        return Response.json({ error: 'Artist not found' }, { status: 404, headers: ERROR_CACHE_HEADERS })
      }
      return Response.json(result, { headers: CACHE_HEADERS })
    }

    case 'album': {
      if (!name || !artist) {
        return Response.json({ error: 'name and artist are required for type=album' }, { status: 400, headers: ERROR_CACHE_HEADERS })
      }
      const result = await getAlbum(artist, name)
      if (!result) {
        return Response.json({ error: 'Album not found' }, { status: 404, headers: ERROR_CACHE_HEADERS })
      }
      return Response.json(result, { headers: CACHE_HEADERS })
    }

    case 'track': {
      if (!name || !artist) {
        return Response.json({ error: 'name and artist are required for type=track' }, { status: 400, headers: ERROR_CACHE_HEADERS })
      }
      const result = await getTrack(artist, name)
      if (!result) {
        return Response.json({ error: 'Track not found' }, { status: 404, headers: ERROR_CACHE_HEADERS })
      }
      return Response.json(result, { headers: CACHE_HEADERS })
    }

    case 'tag': {
      if (!name) {
        return Response.json({ error: 'name is required for type=tag' }, { status: 400, headers: ERROR_CACHE_HEADERS })
      }
      const result = await getTag(name)
      if (!result) {
        return Response.json({ error: 'Tag not found' }, { status: 404, headers: ERROR_CACHE_HEADERS })
      }
      return Response.json(result, { headers: CACHE_HEADERS })
    }

    default:
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }
}
