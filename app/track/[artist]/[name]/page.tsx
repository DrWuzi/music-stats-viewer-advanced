import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistChart } from '@/components/artist-chart'
import { ArtistImage } from '@/components/artist-image'
import {
  Music2,
  ExternalLink,
  Clock,
  Users,
  PlayCircle,
  BarChart2,
  BookOpen,
  Search,
  Trophy,
  User,
} from 'lucide-react'
import { ListenOn } from '@/components/listen-on'
import { EmptyState } from '@/components/ui/empty-state'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackInfo {
  name: string
  artist: string
  album?: { title: string; url?: string }
  url: string
  duration: string
  playcount: string
  listeners: string
  userplaycount: string
  tags: Array<{ name: string; url: string }>
  wiki?: { summary: string }
}

interface SimilarTrack {
  name: string
  artist: string
  url: string
  match: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: string | number) {
  return Number(n).toLocaleString('en-US')
}

function fmtDuration(seconds: string | number): string {
  const s = Number(seconds)
  if (!s) return ''
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
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

// ─── Last.fm fetchers ─────────────────────────────────────────────────────────

async function fetchTrackInfo(
  artist: string,
  track: string,
  username?: string,
): Promise<TrackInfo | null> {
  try {
    const params = new URLSearchParams({
      method: 'track.getInfo',
      artist,
      track,
      api_key: process.env.LASTFM_API_KEY!,
      format: 'json',
    })
    if (username) params.set('username', username)

    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (data.error || !data.track) return null

    const t = data.track
    const albumRaw = t.album
    return {
      name: t.name,
      artist: typeof t.artist === 'string' ? t.artist : (t.artist?.name ?? artist),
      album:
        albumRaw?.title
          ? { title: albumRaw.title, url: albumRaw.url ?? undefined }
          : undefined,
      url: t.url ?? '',
      duration: t.duration ?? '0',
      playcount: t.playcount ?? '0',
      listeners: t.listeners ?? '0',
      userplaycount: t.userplaycount ?? '0',
      tags: (t.toptags?.tag ?? []).slice(0, 8).map((tag: { name: string; url: string }) => ({
        name: tag.name,
        url: tag.url,
      })),
      wiki: t.wiki?.summary ? { summary: t.wiki.summary } : undefined,
    }
  } catch {
    return null
  }
}

async function fetchSimilarTracks(artist: string, track: string): Promise<SimilarTrack[]> {
  try {
    const params = new URLSearchParams({
      method: 'track.getSimilar',
      artist,
      track,
      api_key: process.env.LASTFM_API_KEY!,
      format: 'json',
      limit: '6',
    })
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    return (data.similartracks?.track ?? []).map(
      (t: { name: string; artist: { name: string }; url: string; match: string }) => ({
        name: t.name,
        artist: t.artist?.name ?? artist,
        url: t.url ?? '',
        match: t.match ?? '0',
      }),
    )
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ artist: string; name: string }>
  searchParams?: Promise<{ username?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { artist, name } = await params
  const trackName = decodeURIComponent(name)
  const artistName = decodeURIComponent(artist)
  return { title: `${trackName} — ${artistName} — Last.fm Advanced` }
}

export default async function TrackPage({ params, searchParams }: Props) {
  const { artist, name } = await params
  const sp = await searchParams

  const artistName = decodeURIComponent(artist)
  const trackName = decodeURIComponent(name)

  const session = await getSession()
  const username = sp?.username ?? session?.lastfmUsername

  // Fetch track info + similar in parallel, then look up user if needed
  const [trackInfo, similarTracks, user] = await Promise.all([
    fetchTrackInfo(artistName, trackName, username),
    fetchSimilarTracks(artistName, trackName),
    username ? prisma.user.findUnique({ where: { lastfmUsername: username } }) : null,
  ])

  // User scrobbles for this specific track
  const scrobbles =
    user
      ? await prisma.scrobble.findMany({
          where: {
            userId: user.id,
            artist: { equals: artistName, mode: 'insensitive' },
            track: { equals: trackName, mode: 'insensitive' },
          },
          orderBy: { scrobbledAt: 'asc' },
          select: { scrobbledAt: true },
        })
      : []

  const userPlays = scrobbles.length
  const firstHeard = scrobbles[0]?.scrobbledAt ?? null
  const lastHeard = scrobbles[scrobbles.length - 1]?.scrobbledAt ?? null

  // Monthly plays chart data
  const monthCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 7)
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  }
  const playsByMonth = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, label: month.slice(2), count }))

  const globalPlaycount = trackInfo?.playcount ?? '0'
  const globalListeners = trackInfo?.listeners ?? '0'
  const duration = trackInfo ? fmtDuration(trackInfo.duration) : ''
  const wikiText = trackInfo?.wiki ? stripHtml(trackInfo.wiki.summary) : ''

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  // Medal logic: top listened if >= 50 plays
  const userRankMedal =
    userPlays >= 100 ? '🥇' : userPlays >= 50 ? '🥈' : userPlays >= 20 ? '🥉' : null

  // Lyrics search URLs
  const lyricsQuery = encodeURIComponent(`${trackName} ${artistName}`)
  const geniusUrl = `https://genius.com/search?q=${lyricsQuery}`
  const googleLyricsUrl = `https://www.google.com/search?q=${lyricsQuery}+lyrics`

  return (
    <main className="container mx-auto px-4 max-w-[1400px] py-8 space-y-8">
      {/* ── Breadcrumb + Header ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          {username && (
            <>
              <Link
                href={`/user/${encodeURIComponent(username)}`}
                className="hover:text-foreground"
              >
                {username}
              </Link>
              <span>/</span>
            </>
          )}
          <Link
            href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
            className="hover:text-foreground"
          >
            {artistName}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{trackName}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Track</p>
            <h1 className="text-4xl font-black tracking-tight leading-tight mb-1 bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-transparent">{trackName}</h1>
            <Link
              href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
              className="text-lg text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              {artistName}
            </Link>
            {trackInfo?.album && (
              <div className="mt-1">
                <Link
                  href={`/album/${encodeURIComponent(artistName)}/${encodeURIComponent(trackInfo.album.title)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors inline-flex items-center gap-1"
                >
                  <Music2 className="h-3 w-3" />
                  {trackInfo.album.title}
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 sm:shrink-0">
            {duration && (
              <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" /> Duration
                </div>
                <p className="text-xl font-bold tabular-nums">{duration}</p>
              </div>
            )}
            {Number(globalListeners) > 0 && (
              <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[110px]">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Users className="h-3 w-3" /> Listeners
                </div>
                <p className="text-xl font-bold">{fmtNum(globalListeners)}</p>
              </div>
            )}
            {Number(globalPlaycount) > 0 && (
              <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[110px]">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <PlayCircle className="h-3 w-3" /> Global Plays
                </div>
                <p className="text-xl font-bold">{fmtNum(globalPlaycount)}</p>
              </div>
            )}
            {username && (
              <div
                className="rounded-2xl border backdrop-blur-md px-4 py-3 min-w-[110px]"
                style={{
                  borderColor: userPlays > 0
                    ? 'color-mix(in oklch, var(--primary) 40%, transparent)'
                    : 'color-mix(in oklch, var(--border) 50%, transparent)',
                  background: userPlays > 0
                    ? 'color-mix(in oklch, var(--primary) 10%, transparent)'
                    : undefined,
                }}
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Music2 className="h-3 w-3" /> Your Plays
                </div>
                <p
                  className="text-xl font-bold"
                  style={{ color: userPlays > 0 ? 'var(--primary)' : undefined }}
                >
                  {fmtNum(userPlays)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User rank medal */}
        {userRankMedal && username && userPlays > 0 && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/30 backdrop-blur-sm px-3 py-1.5 text-sm font-medium"
            style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)' }}
          >
            <Trophy className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <span>
              {userRankMedal} You&apos;ve played this{' '}
              <span className="font-bold">{fmtNum(userPlays)}</span> times
            </span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {trackInfo?.url && (
            <a
              href={trackInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View on Last.fm
            </a>
          )}
          <ListenOn type="track" artist={artistName} track={trackName} variant="compact" />
        </div>
      </div>

      {/* ── Tags ─────────────────────────────────────────────────────── */}
      {trackInfo?.tags && trackInfo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {trackInfo.tags.map((tag) => (
            <Link
              key={tag.name}
              href={`/genre/${encodeURIComponent(tag.name.toLowerCase())}`}
            >
              <Badge
                variant="secondary"
                className="capitalize text-xs cursor-pointer hover:bg-muted transition-colors"
              >
                {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* ── Lyrics section ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Lyrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Find lyrics for{' '}
            <span className="font-medium text-foreground">{trackName}</span> by{' '}
            <span className="font-medium text-foreground">{artistName}</span>:
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={geniusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 border border-foreground/10"
              style={{ background: '#ffff64', color: '#1a1a1a' }}
            >
              <BookOpen className="h-4 w-4" />
              Search on Genius
            </a>
            <a
              href={googleLyricsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border border-foreground/10 backdrop-blur-sm transition-colors hover:bg-muted/60"
            >
              <Search className="h-4 w-4" />
              Google lyrics
            </a>
          </div>
          <p className="text-xs text-muted-foreground">Lyrics provided by Genius</p>
        </CardContent>
      </Card>

      {/* ── Plays comparison + User stats ───────────────────────────── */}
      {username && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Play count comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4" /> Play Count Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Your plays</span>
                  <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                    {fmtNum(userPlays)}
                  </span>
                </div>
                {Number(globalPlaycount) > 0 && (
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'color-mix(in oklch, var(--muted) 80%, transparent)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (userPlays / Number(globalPlaycount)) * 100 * 5000)}%`,
                        background: 'var(--primary)',
                        minWidth: userPlays > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Global plays</span>
                  <span className="font-semibold">{fmtNum(globalPlaycount)}</span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ background: 'color-mix(in oklch, var(--muted) 80%, transparent)' }}
                >
                  <div
                    className="h-full w-full rounded-full"
                    style={{ background: 'var(--muted-foreground)', opacity: 0.4 }}
                  />
                </div>
              </div>
              {Number(globalPlaycount) > 0 && userPlays > 0 && (
                <p className="text-xs text-muted-foreground">
                  Your plays represent{' '}
                  <span className="font-semibold text-foreground">
                    {((userPlays / Number(globalPlaycount)) * 100).toFixed(4)}%
                  </span>{' '}
                  of all global plays
                </p>
              )}
            </CardContent>
          </Card>

          {/* User stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Music2 className="h-4 w-4" /> Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userPlays === 0 ? (
                <EmptyState icon={Music2} title="You haven't scrobbled this track yet, or the data hasn't synced." />
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total plays</span>
                    <span className="font-semibold">{fmtNum(userPlays)}</span>
                  </div>
                  {firstHeard && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">First heard</span>
                      <span className="font-semibold">{fmt(firstHeard)}</span>
                    </div>
                  )}
                  {lastHeard && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last heard</span>
                      <span className="font-semibold">{fmt(lastHeard)}</span>
                    </div>
                  )}
                  {firstHeard && lastHeard && firstHeard.getTime() !== lastHeard.getTime() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Listening span</span>
                      <span className="font-semibold">
                        {Math.round(
                          (lastHeard.getTime() - firstHeard.getTime()) / (1000 * 60 * 60 * 24),
                        )}{' '}
                        days
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Wiki summary ────────────────────────────────────────────── */}
      {wikiText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
              {wikiText}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Your History (Monthly plays chart) ──────────────────────── */}
      {playsByMonth.length > 0 && (
        <div className="space-y-2">
          <ArtistChart
            data={playsByMonth}
            title={`Your "${trackName}" Play History`}
          />
          {(firstHeard || lastHeard) && (
            <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
              {firstHeard && (
                <span>
                  First heard:{' '}
                  <span className="font-medium text-foreground">{fmt(firstHeard)}</span>
                </span>
              )}
              {lastHeard && (
                <span>
                  Most recent:{' '}
                  <span className="font-medium text-foreground">{fmt(lastHeard)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Similar tracks ───────────────────────────────────────────── */}
      {similarTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Music2 className="h-4 w-4" /> Similar Tracks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {similarTracks.slice(0, 6).map((track) => (
                <Link
                  key={`${track.artist}::${track.name}`}
                  href={`/track/${encodeURIComponent(track.artist)}/${encodeURIComponent(track.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors group border border-transparent hover:border-foreground/10"
                >
                  <ArtistImage name={track.artist} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {track.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {(Number(track.match) * 100).toFixed(0)}%
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── No user state ────────────────────────────────────────────── */}
      {!username && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <EmptyState
              icon={User}
              title="Sign in or add ?username=yourname to see your personal stats."
              action={{ label: 'Sign in', href: '/login' }}
            />
          </CardContent>
        </Card>
      )}
    </main>
  )
}
