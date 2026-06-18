import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistChart } from '@/components/artist-chart'
import { ArtistBio } from '@/components/artist-bio'
import { Users, Disc3, Music2, ExternalLink, PlayCircle, BarChart2 } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { ListenOn } from '@/components/listen-on'

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
  // Fallback: Wikipedia MediaWiki API (handles redirects + disambiguation)
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: artistName,
      prop: 'pageimages',
      pithumbsize: '1200',
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
    if (res.ok) {
      const data = await res.json()
      const pages: Array<{ thumbnail?: { source: string } }> = data?.query?.pages ?? []
      const src = pages[0]?.thumbnail?.source
      if (src) return src
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

  // Fan rank badge: ratio of user plays to global listeners, expressed as %
  const globalListeners = Number(artistInfo?.stats.listeners ?? 0)
  const fanRankPercent =
    totalPlays > 0 && globalListeners > 0 ? (totalPlays / globalListeners) * 100 : null
  const fanRank =
    fanRankPercent === null
      ? null
      : fanRankPercent >= 1
        ? { label: 'Top 1% listener', tier: 'gold' as const }
        : fanRankPercent >= 0.5
          ? { label: 'Top 5% listener', tier: 'primary' as const }
          : fanRankPercent >= 0.1
            ? { label: 'Devoted fan', tier: 'muted' as const }
            : null

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
      <div className="container mx-auto px-4 max-w-[1400px] pt-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Artists' }, { label: artistInfo?.name ?? artistName }]} />
      </div>
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '500px' }}>
        {/* Background image or fallback gradient */}
        {heroImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImage})`, backgroundAttachment: 'fixed' }}
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
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 40%, transparent) 35%, transparent 100%)',
          }}
        />

        {/* Text content */}
        <div className="relative container mx-auto px-4 max-w-[1400px] pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col justify-end h-full" style={{ minHeight: '500px' }}>
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
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-none mb-3 break-words" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                {artistName}
              </h1>
              {/* Play on Spotify / YouTube */}
              <div className="flex items-center gap-2 mb-4">
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(artistName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Play ${artistName} on Spotify`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 backdrop-blur-sm px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-card/80 transition-colors"
                >
                  <Music2 className="h-3.5 w-3.5 shrink-0" />
                  Spotify
                </a>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Play ${artistName} on YouTube`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 backdrop-blur-sm px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-card/80 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  YouTube
                </a>
                <ListenOn type="artist" artist={artistInfo?.name ?? artistName} variant="compact" />
              </div>
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
              {fanRank && (
                <div className="flex items-end pb-1">
                  <Badge
                    className={
                      fanRank.tier === 'gold'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 text-xs px-3 py-1.5'
                        : fanRank.tier === 'primary'
                          ? 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 text-xs px-3 py-1.5'
                          : 'bg-muted text-muted-foreground border border-border hover:bg-muted text-xs px-3 py-1.5'
                    }
                  >
                    {fanRank.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-[1400px] py-8 space-y-10">

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
                    {artistInfo.similar.map((sim) => (
                      <Link
                        key={sim.name}
                        href={`/artist/${encodeURIComponent(sim.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                        className="flex items-center gap-3 group"
                      >
                        <ArtistImage name={sim.name} size="sm" />
                        <span className="text-sm font-medium group-hover:underline truncate">{sim.name}</span>
                      </Link>
                    ))}
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
                  <Link
                    key={album.name}
                    href={`/album/${encodeURIComponent(artistInfo?.name ?? artistName)}/${encodeURIComponent(album.name)}`}
                    className={`group animate-fade-in-up ${delayClass} cursor-pointer`}
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border mb-2 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                      {albumImg ? (
                        <img
                          src={albumImg}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {/* Persistent bottom gradient with play count */}
                      <div
                        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                        style={{
                          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                        }}
                      />
                      {/* Play count — always visible at bottom */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 pb-2 pointer-events-none">
                        <span className="text-white/90 text-[10px] font-semibold tabular-nums leading-none">
                          {fmtNum(album.playcount)}
                        </span>
                        <PlayCircle className="h-3 w-3 text-white/70" />
                      </div>
                      {/* Hover overlay — darkens further and shows CTA */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-semibold tracking-wide drop-shadow">View album →</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium truncate leading-tight group-hover:underline">{album.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtNum(album.playcount)} plays</p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── View full discography link ───────────────────────────────── */}
        {topAlbums.length > 0 && (
          <div className="flex justify-end -mt-6">
            <Link
              href={`/artist/${encodeURIComponent(artistInfo?.name ?? artistName)}/discography${username ? `?username=${encodeURIComponent(username)}` : ''}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              View full discography →
            </Link>
          </div>
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

        {/* ── 52-week scrobble heatmap ──────────────────────────────────── */}
        {scrobbles.length > 0 && (() => {
          // Anchor: end of current week (Saturday night)
          const now = new Date()
          const daysToSat = 6 - now.getDay()
          const anchorEnd = new Date(now)
          anchorEnd.setDate(anchorEnd.getDate() + daysToSat)
          anchorEnd.setHours(23, 59, 59, 999)

          const msPerWeek = 7 * 24 * 60 * 60 * 1000
          const windowStart = new Date(anchorEnd.getTime() - 52 * msPerWeek)

          // Per-week scrobble counts (index 0 = oldest week)
          const weekCounts = new Array<number>(52).fill(0)
          for (const s of scrobbles) {
            const t = new Date(s.scrobbledAt).getTime()
            if (t < windowStart.getTime()) continue
            const weekIdx = Math.floor((t - windowStart.getTime()) / msPerWeek)
            if (weekIdx >= 0 && weekIdx < 52) weekCounts[weekIdx]++
          }
          const maxCount = Math.max(...weekCounts, 1)

          // Month label positions
          const monthLabels: { col: number; label: string }[] = []
          let lastMonth = -1
          for (let col = 0; col < 52; col++) {
            const d = new Date(windowStart.getTime() + col * msPerWeek)
            const m = d.getMonth()
            if (m !== lastMonth) {
              monthLabels.push({ col, label: d.toLocaleString('en-US', { month: 'short' }) })
              lastMonth = m
            }
          }

          // 52 cols × 7 rows; all rows in a column share the week's count
          const cells: { col: number; row: number; count: number; opacity: number }[] = []
          for (let col = 0; col < 52; col++) {
            const count = weekCounts[col]
            const opacity = count === 0 ? 0 : Math.round((count / maxCount) * 80 + 10)
            for (let row = 0; row < 7; row++) {
              cells.push({ col, row, count, opacity })
            }
          }

          const yearTotal = weekCounts.reduce((a, b) => a + b, 0)

          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Your scrobble activity — last 52 weeks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {/* Month labels */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(52, 1fr)',
                      gap: '2px',
                      marginBottom: '2px',
                      minWidth: '520px',
                    }}
                  >
                    {Array.from({ length: 52 }, (_, col) => {
                      const ml = monthLabels.find((m) => m.col === col)
                      return (
                        <div
                          key={col}
                          style={{ fontSize: '9px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', lineHeight: 1 }}
                        >
                          {ml ? ml.label : ''}
                        </div>
                      )
                    })}
                  </div>
                  {/* Grid: column-major so weeks read left→right */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(52, 1fr)',
                      gridTemplateRows: 'repeat(7, 1fr)',
                      gap: '2px',
                      minWidth: '520px',
                    }}
                  >
                    {cells.map(({ col, row, count, opacity }) => (
                      <div
                        key={`${col}-${row}`}
                        title={count > 0 ? `${count} scrobble${count === 1 ? '' : 's'}` : undefined}
                        style={{
                          gridColumn: col + 1,
                          gridRow: row + 1,
                          aspectRatio: '1',
                          borderRadius: '2px',
                          backgroundColor:
                            count === 0
                              ? 'color-mix(in oklch, var(--muted) 40%, transparent)'
                              : `color-mix(in oklch, var(--primary) ${opacity}%, transparent)`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {yearTotal} scrobble{yearTotal === 1 ? '' : 's'} in the last year
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })()}

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
