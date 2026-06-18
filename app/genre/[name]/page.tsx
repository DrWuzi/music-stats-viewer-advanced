import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistImage } from '@/components/artist-image'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { Music2, Disc3, BarChart2, Tag, PlayCircle, Users } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagArtist {
  name: string
  playcount: string
  listeners: string
  url: string
  image: Array<{ '#text': string; size: string }>
}

interface TagTrack {
  name: string
  duration: string
  playcount: string
  url: string
  artist: { name: string; url: string }
  image: Array<{ '#text': string; size: string }>
}

interface TagAlbum {
  name: string
  playcount: string
  url: string
  image: Array<{ '#text': string; size: string }>
  artist: { name: string; url: string }
}

interface TagInfo {
  name: string
  reach: string
  total: string
  wiki?: { summary: string }
  similar?: { tag: Array<{ name: string; url: string }> }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBestImage(
  images: Array<{ '#text': string; size: string }>,
  preferred = ['extralarge', 'large', 'medium', 'small'],
): string | null {
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
  for (const size of preferred) {
    const found = images.find((i) => i.size === size)
    if (found?.['#text'] && !found['#text'].includes(PLACEHOLDER)) return found['#text']
  }
  return null
}

function fmtNum(n: string | number) {
  const num = Number(n)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

function stripHtml(html: string): string {
  return html
    .replace(/<a[^>]*>Read more on Last\.fm<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Last.fm Fetchers ─────────────────────────────────────────────────────────

const BASE = 'https://ws.audioscrobbler.com/2.0/'
const revalidate = { next: { revalidate: 3600 } }

async function fetchTagArtists(tag: string): Promise<TagArtist[]> {
  try {
    const res = await fetch(
      `${BASE}?method=tag.gettopartists&tag=${encodeURIComponent(tag)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=20`,
      revalidate,
    )
    const data = await res.json()
    return data?.topartists?.artist ?? []
  } catch {
    return []
  }
}

async function fetchTagTracks(tag: string): Promise<TagTrack[]> {
  try {
    const res = await fetch(
      `${BASE}?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=20`,
      revalidate,
    )
    const data = await res.json()
    return data?.tracks?.track ?? []
  } catch {
    return []
  }
}

async function fetchTagAlbums(tag: string): Promise<TagAlbum[]> {
  try {
    const res = await fetch(
      `${BASE}?method=tag.gettopalbums&tag=${encodeURIComponent(tag)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=12`,
      revalidate,
    )
    const data = await res.json()
    return data?.albums?.album ?? []
  } catch {
    return []
  }
}

async function fetchTagInfo(tag: string): Promise<TagInfo | null> {
  try {
    const res = await fetch(
      `${BASE}?method=tag.getinfo&tag=${encodeURIComponent(tag)}&api_key=${process.env.LASTFM_API_KEY}&format=json`,
      revalidate,
    )
    const data = await res.json()
    if (data.error || !data.tag) return null
    return data.tag as TagInfo
  } catch {
    return null
  }
}

// ─── Page Props ───────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ name: string }>
  searchParams: Promise<{ user?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params
  const tagName = decodeURIComponent(name)
  return {
    title: `${tagName} — Genre Deep Dive`,
    description: `Top artists, tracks, and albums tagged "${tagName}" on Last.fm`,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GenreDetailPage({ params, searchParams }: Props) {
  const { name } = await params
  const sp = await searchParams
  const tagName = decodeURIComponent(name)
  const username = sp?.user ?? null

  // Parallel fetch all Last.fm data
  const [tagArtists, tagTracks, tagAlbums, tagInfo] = await Promise.all([
    fetchTagArtists(tagName),
    fetchTagTracks(tagName),
    fetchTagAlbums(tagName),
    fetchTagInfo(tagName),
  ])

  const description = tagInfo?.wiki?.summary ? stripHtml(tagInfo.wiki.summary) : null
  const totalScrobbles = tagInfo?.total ? Number(tagInfo.total) : null
  const reach = tagInfo?.reach ? Number(tagInfo.reach) : null
  const similarTags: Array<{ name: string; url: string }> = tagInfo?.similar?.tag ?? []

  // User artist matches (if username given)
  type MatchArtist = { name: string; playcount: number; tagRank: number }
  let userMatches: MatchArtist[] = []
  let validUser = false

  if (username) {
    const tagArtistMap = new Map<string, number>()
    tagArtists.forEach((a, idx) => tagArtistMap.set(a.name.toLowerCase(), idx + 1))

    const user = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true },
    })

    if (user) {
      validUser = true
      const userArtists = await prisma.topArtist.findMany({
        where: { userId: user.id, period: 'overall' },
        orderBy: { rank: 'asc' },
        select: { name: true, playcount: true },
      })

      userMatches = userArtists
        .filter((a) => tagArtistMap.has(a.name.toLowerCase()))
        .map((a) => ({
          name: a.name,
          playcount: a.playcount,
          tagRank: tagArtistMap.get(a.name.toLowerCase())!,
        }))
        .sort((a, b) => b.playcount - a.playcount)
        .slice(0, 15)
    }
  }

  const maxPlaycount = userMatches.length > 0 ? userMatches[0].playcount : 1

  return (
    <main>
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          minHeight: '340px',
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--primary) 20%, var(--background)) 0%, var(--background) 100%)',
        }}
      >
        {/* Decorative accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 60% 0%, color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 70%)',
          }}
        />

        <div className="relative container mx-auto px-4 max-w-[1400px] pt-4 pb-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Genres' },
              { label: tagName },
            ]}
          />

          <div className="mt-8 flex flex-col md:flex-row md:items-end gap-6">
            {/* Left: tag icon + name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="rounded-xl p-3 border"
                  style={{
                    background: 'color-mix(in oklch, var(--primary) 15%, var(--card))',
                    borderColor: 'color-mix(in oklch, var(--primary) 30%, var(--border))',
                  }}
                >
                  <Tag className="h-6 w-6" style={{ color: 'var(--primary)' }} />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Genre / Tag</p>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none mb-4 capitalize">
                {tagName}
              </h1>

              {description && (
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed line-clamp-3">
                  {description}
                </p>
              )}
            </div>

            {/* Right: stat tiles */}
            <div className="flex flex-wrap gap-3 md:shrink-0">
              {totalScrobbles !== null && totalScrobbles > 0 && (
                <div
                  className="rounded-xl border px-4 py-3 min-w-[120px]"
                  style={{
                    background: 'color-mix(in oklch, var(--card) 80%, transparent)',
                    borderColor: 'var(--border)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <PlayCircle className="h-3 w-3" /> Total Scrobbles
                  </div>
                  <p className="text-xl font-bold">{fmtNum(totalScrobbles)}</p>
                </div>
              )}
              {reach !== null && reach > 0 && (
                <div
                  className="rounded-xl border px-4 py-3 min-w-[120px]"
                  style={{
                    background: 'color-mix(in oklch, var(--card) 80%, transparent)',
                    borderColor: 'var(--border)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="h-3 w-3" /> Listeners
                  </div>
                  <p className="text-xl font-bold">{fmtNum(reach)}</p>
                </div>
              )}
              {tagArtists.length > 0 && (
                <div
                  className="rounded-xl border px-4 py-3 min-w-[120px]"
                  style={{
                    background: 'color-mix(in oklch, var(--card) 80%, transparent)',
                    borderColor: 'var(--border)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Music2 className="h-3 w-3" /> Artists
                  </div>
                  <p className="text-xl font-bold">{tagArtists.length}+</p>
                </div>
              )}
            </div>
          </div>

          {/* Similar tags */}
          {similarTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="text-xs text-muted-foreground self-center">Related:</span>
              {similarTags.slice(0, 10).map((t) => (
                <Link
                  key={t.name}
                  href={`/genre/${encodeURIComponent(t.name)}`}
                  className="inline-flex"
                >
                  <Badge
                    variant="secondary"
                    className="capitalize hover:bg-primary/20 transition-colors cursor-pointer text-xs"
                  >
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-[1400px] py-8 space-y-10">

        {/* ── User artist matches ──────────────────────────────────────────── */}
        {username && validUser && userMatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Your {tagName} Artists
                <span className="text-sm font-normal text-muted-foreground">
                  — {userMatches.length} match{userMatches.length !== 1 ? 'es' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userMatches.map(({ name, playcount, tagRank }) => {
                  const pct = (playcount / maxPlaycount) * 100
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={`/artist/${encodeURIComponent(name)}?username=${encodeURIComponent(username)}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {name}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>#{tagRank} in tag</span>
                          <span className="tabular-nums">{playcount.toLocaleString()} plays</span>
                        </div>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--muted)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: 'var(--primary)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {username && !validUser && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                User <strong>{username}</strong> not found. Visit their profile first to sync data.
              </p>
            </CardContent>
          </Card>
        )}

        {username && validUser && userMatches.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                None of your top artists appear in the Last.fm <strong>{tagName}</strong> tag list.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Top Artists ───────────────────────────────────────────────────── */}
        {tagArtists.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              Top {tagName} Artists
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tagArtists.map((artist, idx) => (
                <Link
                  key={artist.name}
                  href={`/artist/${encodeURIComponent(artist.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                  className="group flex flex-col items-center text-center gap-2 p-3 rounded-xl border border-transparent hover:border-border hover:bg-card transition-all duration-200"
                >
                  <div className="relative">
                    <ArtistImage name={artist.name} size="lg" />
                    <span
                      className="absolute -top-1 -left-1 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        fontSize: '10px',
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>
                  <div className="w-full min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:underline">{artist.name}</p>
                    {Number(artist.listeners) > 0 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {fmtNum(artist.listeners)} listeners
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Tracks + Albums row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tracks */}
          {tagTracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Top Tracks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {tagTracks.slice(0, 20).map((track, idx) => (
                    <li key={`${track.artist.name}-${track.name}`} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-5 text-right shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/track/${encodeURIComponent(track.artist.name)}/${encodeURIComponent(track.name)}`}
                          className="text-sm font-medium truncate block hover:underline"
                        >
                          {track.name}
                        </Link>
                        <Link
                          href={`/artist/${encodeURIComponent(track.artist.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                          className="text-xs text-muted-foreground truncate block hover:underline"
                        >
                          {track.artist.name}
                        </Link>
                      </div>
                      {Number(track.playcount) > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {fmtNum(track.playcount)}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Top Albums */}
          {tagAlbums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Disc3 className="h-5 w-5" />
                Top Albums
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {tagAlbums.map((album) => {
                  const img = getBestImage(album.image)
                  return (
                    <Link
                      key={`${album.artist.name}-${album.name}`}
                      href={`/album/${encodeURIComponent(album.artist.name)}/${encodeURIComponent(album.name)}`}
                      className="group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted mb-1.5 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md">
                        {img ? (
                          <img src={img} alt={album.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {/* Bottom gradient with play count */}
                        <div
                          className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                          style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                          }}
                        />
                        {Number(album.playcount) > 0 && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-2 pb-1.5 pointer-events-none">
                            <PlayCircle className="h-2.5 w-2.5 text-white/80 shrink-0" />
                            <span className="text-white/90 text-[9px] font-semibold tabular-nums truncate">
                              {fmtNum(album.playcount)}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate leading-tight group-hover:underline">
                        {album.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{album.artist.name}</p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Similar tags at bottom ────────────────────────────────────────── */}
        {similarTags.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Similar Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {similarTags.map((t) => (
                <Link
                  key={t.name}
                  href={`/genre/${encodeURIComponent(t.name)}`}
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className="capitalize hover:bg-primary/15 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── No API key state ──────────────────────────────────────────────── */}
        {tagArtists.length === 0 && tagTracks.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No data found for tag <strong>&ldquo;{tagName}&rdquo;</strong>. The tag may not exist
              on Last.fm, or the API key may be missing.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
