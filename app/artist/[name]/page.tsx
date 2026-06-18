import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistChart } from '@/components/artist-chart'
import { ArtistBio } from '@/components/artist-bio'
import { Users, Disc3, Music2, ExternalLink, PlayCircle, BarChart2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArtistInfo {
  name: string
  url: string
  images: Array<{ '#text': string; size: string }>
  stats: { listeners: string; playcount: string }
  similar: Array<{ name: string; image: Array<{ '#text': string; size: string }> }>
  tags: Array<{ name: string; url: string }>
  bio: { summary: string }
}

interface Album {
  name: string
  playcount: string
  url: string
  image: Array<{ '#text': string; size: string }>
}

interface GlobalTrack {
  name: string
  playcount: string
  listeners: string
  url: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBestImage(
  images: Array<{ '#text': string; size: string }>,
  preferred = ['mega', 'extralarge', 'large', 'medium', 'small'],
): string | null {
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
  for (const size of preferred) {
    const found = images.find((i) => i.size === size)
    if (found?.['#text'] && !found['#text'].includes(PLACEHOLDER)) return found['#text']
  }
  return null
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

function fmtNum(n: string | number) {
  return Number(n).toLocaleString('en-US')
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Image fetchers ──────────────────────────────────────────────────────────

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

async function fetchHeroImage(artistName: string, lfmImages: Array<{ '#text': string; size: string }>): Promise<string | null> {
  // Try Last.fm first
  for (const size of ['mega', 'extralarge', 'large']) {
    const img = lfmImages.find((i) => i.size === size)
    if (img?.['#text'] && !img['#text'].includes(PLACEHOLDER) && img['#text'].length > 10) {
      return img['#text']
    }
  }
  // Fallback: Wikipedia
  try {
    const title = artistName.trim().replace(/ /g, '_')
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { 'User-Agent': 'LastFmAdvanced/1.0 (educational/personal project)' },
        next: { revalidate: 86400 },
      },
    )
    if (res.ok) {
      const data = await res.json()
      const src: string | undefined = data?.originalimage?.source ?? data?.thumbnail?.source
      if (src) return src.replace(/\/\d+px-/, '/1200px-')
    }
  } catch {}
  return null
}

// ─── Last.fm fetchers ─────────────────────────────────────────────────────────

async function fetchArtistInfo(name: string): Promise<ArtistInfo | null> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${process.env.LASTFM_API_KEY}&format=json`,
      { next: { revalidate: 3600 } },
    )
    const data = await res.json()
    if (data.error || !data.artist) return null
    const a = data.artist
    return {
      name: a.name,
      url: a.url,
      images: a.image ?? [],
      stats: { listeners: a.stats?.listeners ?? '0', playcount: a.stats?.playcount ?? '0' },
      similar: (a.similar?.artist ?? []).slice(0, 6).map((s: { name: string; image: unknown[] }) => ({
        name: s.name,
        image: s.image ?? [],
      })),
      tags: (a.tags?.tag ?? []).slice(0, 6).map((t: { name: string; url: string }) => ({
        name: t.name,
        url: t.url,
      })),
      bio: { summary: a.bio?.summary ?? '' },
    }
  } catch {
    return null
  }
}

async function fetchTopAlbums(name: string): Promise<Album[]> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(name)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=12`,
      { next: { revalidate: 3600 } },
    )
    const data = await res.json()
    return (data.topalbums?.album ?? []).map(
      (a: { name: string; playcount: string; url: string; image: unknown[] }) => ({
        name: a.name,
        playcount: a.playcount,
        url: a.url,
        image: a.image ?? [],
      }),
    )
  } catch {
    return []
  }
}

async function fetchGlobalTopTracks(name: string): Promise<GlobalTrack[]> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=10`,
      { next: { revalidate: 3600 } },
    )
    const data = await res.json()
    return (data.toptracks?.track ?? []).map(
      (t: { name: string; playcount: string; listeners: string; url: string }) => ({
        name: t.name,
        playcount: t.playcount,
        listeners: t.listeners,
        url: t.url,
      }),
    )
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ name: string }>
  searchParams?: Promise<{ username?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params
  return { title: decodeURIComponent(name) + ' — Last.fm Advanced' }
}

export default async function ArtistPage({ params, searchParams }: Props) {
  const { name } = await params
  const sp = await searchParams
  const artistName = decodeURIComponent(name)

  const session = await getSession()
  const username = sp?.username ?? session?.lastfmUsername

  // Fetch everything in parallel
  const [artistInfo, topAlbums, globalTopTracks, user] = await Promise.all([
    fetchArtistInfo(artistName),
    fetchTopAlbums(artistName),
    fetchGlobalTopTracks(artistName),
    username ? prisma.user.findUnique({ where: { lastfmUsername: username } }) : null,
  ])

  // User scrobbles for this artist
  const scrobbles =
    user
      ? await prisma.scrobble.findMany({
          where: { userId: user.id, artist: { equals: artistName, mode: 'insensitive' } },
          orderBy: { scrobbledAt: 'asc' },
          select: { track: true, album: true, scrobbledAt: true },
        })
      : []

  const heroImage = await fetchHeroImage(artistName, artistInfo?.images ?? [])
  const bioText = artistInfo ? stripHtml(artistInfo.bio.summary) : ''

  const totalPlays = scrobbles.length
  const firstHeard = scrobbles[0]?.scrobbledAt ?? null
  const lastHeard = scrobbles[scrobbles.length - 1]?.scrobbledAt ?? null

  // User top tracks
  const trackCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    trackCounts[s.track] = (trackCounts[s.track] ?? 0) + 1
  }
  const userTopTracks = Object.entries(trackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Monthly plays chart data
  const monthCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 7)
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  }
  const playsByMonth = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, label: month.slice(2), count }))

  return (
    <main>
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {/* Background image or fallback gradient */}
        {heroImage ? (
          <div
            className="absolute inset-0 bg-cover bg-top bg-no-repeat"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
            <span className="text-[20rem] font-black leading-none select-none opacity-10 text-white">
              {artistName[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {/* Subtle overall darkening so text is always readable */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Bottom-up fade into page background — the "Last.fm style" gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 80%, transparent) 35%, color-mix(in oklch, var(--background) 20%, transparent) 60%, transparent 100%)',
          }}
        />

        {/* Text content */}
        <div className="relative container mx-auto px-4 max-w-6xl pt-6 pb-10 flex flex-col justify-end h-full" style={{ minHeight: '420px' }}>
          <Link
            href={username ? `/user/${encodeURIComponent(username)}` : '/'}
            className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1"
          >
            ← {username ? `${username}'s profile` : 'Home'}
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-6 animate-fade-in-up">
            {/* Left: name + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Artist</p>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-4 break-words">
                {artistName}
              </h1>
              {/* Genre tags */}
              {artistInfo?.tags.length ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {artistInfo.tags.map((tag) => (
                    <Badge key={tag.name} variant="secondary" className="capitalize text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {artistInfo?.url && (
                <a
                  href={artistInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Last.fm
                </a>
              )}
            </div>

            {/* Right: stat tiles */}
            <div className="flex flex-wrap gap-3 md:shrink-0">
              {artistInfo && Number(artistInfo.stats.listeners) > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3 min-w-[110px]">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Users className="h-3 w-3" /> Listeners
                  </div>
                  <p className="text-xl font-bold">{fmtNum(artistInfo.stats.listeners)}</p>
                </div>
              )}
              {artistInfo && Number(artistInfo.stats.playcount) > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3 min-w-[110px]">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <PlayCircle className="h-3 w-3" /> Global Plays
                  </div>
                  <p className="text-xl font-bold">{fmtNum(artistInfo.stats.playcount)}</p>
                </div>
              )}
              {username && totalPlays > 0 && (
                <div className="rounded-xl border border-primary/40 bg-primary/15 backdrop-blur-sm px-4 py-3 min-w-[110px]">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Music2 className="h-3 w-3" /> Your Plays
                  </div>
                  <p className="text-xl font-bold text-primary">{fmtNum(totalPlays)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-6xl py-8 space-y-10">

        {/* Bio + sidebar row */}
        {(bioText || artistInfo?.similar.length || (username && totalPlays > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bio */}
            {bioText ? (
              <div className="md:col-span-2">
                <ArtistBio bio={bioText} />
              </div>
            ) : <div className="md:col-span-2" />}

            {/* Sidebar */}
            <div className="space-y-4">
              {/* User stats card */}
              {username && totalPlays > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Your Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plays</span>
                      <span className="font-semibold">{fmtNum(totalPlays)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unique Tracks</span>
                      <span className="font-semibold">{Object.keys(trackCounts).length}</span>
                    </div>
                    {firstHeard && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">First Heard</span>
                        <span className="font-semibold">{fmtDate(firstHeard)}</span>
                      </div>
                    )}
                    {lastHeard && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Heard</span>
                        <span className="font-semibold">{fmtDate(lastHeard)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Similar artists */}
              {artistInfo?.similar.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Similar Artists</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {artistInfo.similar.map((sim) => {
                      const simImg = getBestImage(sim.image, ['medium', 'small'])
                      return (
                        <Link
                          key={sim.name}
                          href={`/artist/${encodeURIComponent(sim.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
                            {simImg ? (
                              <img src={simImg} alt={sim.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {sim.name[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium group-hover:underline truncate">{sim.name}</span>
                        </Link>
                      )
                    })}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Albums grid ───────────────────────────────────────────────── */}
        {topAlbums.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Disc3 className="h-5 w-5" /> Discography
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topAlbums.map((album, idx) => {
                const albumImg = getBestImage(album.image, ['extralarge', 'large', 'medium'])
                const delays = [
                  'animation-delay-0',
                  'animation-delay-100',
                  'animation-delay-200',
                  'animation-delay-300',
                  'animation-delay-400',
                  'animation-delay-500',
                ]
                const delayClass = delays[idx % delays.length]
                return (
                  <a
                    key={album.name}
                    href={album.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group animate-fade-in-up ${delayClass}`}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border mb-2 shadow-sm">
                      {albumImg ? (
                        <img
                          src={albumImg}
                          alt={album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate leading-tight group-hover:underline">{album.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtNum(album.playcount)} plays</p>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Tracks: global + user ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Popular Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {globalTopTracks.length > 0 ? (
                <ol className="space-y-3">
                  {globalTopTracks.map((t, i) => (
                    <li key={t.name} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm truncate hover:underline"
                      >
                        {t.name}
                      </a>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {fmtNum(t.listeners)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No tracks found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="h-4 w-4" /> Your Top Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userTopTracks.length > 0 ? (
                <ol className="space-y-3">
                  {userTopTracks.map(([track, count], i) => (
                    <li key={track} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                      <span className="flex-1 text-sm truncate">{track}</span>
                      <span className="text-sm font-semibold shrink-0 tabular-nums">{count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No tracks found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Play history ──────────────────────────────────────────────── */}
        {playsByMonth.length > 0 && (
          <ArtistChart data={playsByMonth} title={`Your ${artistName} History`} />
        )}

        {/* ── No data states ────────────────────────────────────────────── */}
        {!username && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline">Sign in</Link> or add{' '}
              <code className="bg-muted px-1 rounded text-xs">?username=yourname</code> to see your personal stats.
            </CardContent>
          </Card>
        )}
        {username && totalPlays === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You haven&apos;t scrobbled <strong>{artistName}</strong> yet, or the data hasn&apos;t synced.{' '}
              <Link href={`/user/${encodeURIComponent(username)}`} className="underline">
                Back to profile
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
