import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistChart } from '@/components/artist-chart'
import { ArtistBio } from '@/components/artist-bio'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { ListenOn } from '@/components/listen-on'
import { Disc3, Music2, ExternalLink, PlayCircle, Users, CheckCircle2, User } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContainer } from '@/components/page-container'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LfmTrack {
  name: string
  duration: string
  url: string
  userplaycount?: string
  '@attr'?: { rank: string }
}

interface AlbumInfo {
  name: string
  artist: string
  url: string
  image: Array<{ '#text': string; size: string }>
  listeners: string
  playcount: string
  userplaycount?: string
  releasedate?: string
  wiki?: { published?: string; summary?: string; content?: string }
  tracks?: { track?: LfmTrack[] | LfmTrack }
  tags?: { tag?: Array<{ name: string; url: string }> | { name: string; url: string } }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

function getBestImage(
  images: Array<{ '#text': string; size: string }>,
  preferred = ['mega', 'extralarge', 'large', 'medium', 'small'],
): string | null {
  for (const size of preferred) {
    const found = images.find((i) => i.size === size)
    if (found?.['#text'] && !found['#text'].includes(PLACEHOLDER)) return found['#text']
  }
  return null
}

function fmtNum(n: string | number) {
  return Number(n).toLocaleString('en-US')
}

function fmtDuration(seconds: string | number): string {
  const s = Number(seconds)
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

// ─── Last.fm fetch ────────────────────────────────────────────────────────────

async function fetchAlbumInfo(
  artist: string,
  album: string,
  username?: string,
): Promise<AlbumInfo | null> {
  try {
    const params = new URLSearchParams({
      method: 'album.getInfo',
      artist,
      album,
      api_key: process.env.LASTFM_API_KEY ?? '',
      format: 'json',
      autocorrect: '1',
    })
    if (username) params.set('username', username)

    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (data.error || !data.album) return null
    return data.album as AlbumInfo
  } catch {
    return null
  }
}

// Fetch artist's top albums from Last.fm to find similar (related) albums
async function fetchArtistTopAlbums(
  artist: string,
  excludeAlbum: string,
): Promise<Array<{ name: string; image: Array<{ '#text': string; size: string }>; playcount: string }>> {
  try {
    const params = new URLSearchParams({
      method: 'artist.getTopAlbums',
      artist,
      api_key: process.env.LASTFM_API_KEY ?? '',
      format: 'json',
      limit: '10',
    })
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const albums = (data.topalbums?.album ?? []) as Array<{
      name: string
      image: Array<{ '#text': string; size: string }>
      playcount: string
    }>
    return albums
      .filter((a) => a.name.toLowerCase() !== excludeAlbum.toLowerCase())
      .slice(0, 6)
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
  const albumName = decodeURIComponent(name)
  const artistName = decodeURIComponent(artist)
  return { title: `${albumName} by ${artistName} — Last.fm Advanced` }
}

export default async function AlbumDetailPage({ params, searchParams }: Props) {
  const { artist, name } = await params
  const sp = await searchParams

  const artistName = decodeURIComponent(artist)
  const albumName = decodeURIComponent(name)

  if (!artistName || !albumName) notFound()

  const session = await getSession()
  const username = sp?.username ?? session?.lastfmUsername

  // Fetch Last.fm data + user in parallel
  const [albumInfo, relatedAlbums, user] = await Promise.all([
    fetchAlbumInfo(artistName, albumName, username ?? undefined),
    fetchArtistTopAlbums(artistName, albumName),
    username ? prisma.user.findUnique({ where: { lastfmUsername: username } }) : null,
  ])

  if (!albumInfo) {
    return (
      <PageContainer as="main" maxWidth="3xl" className="py-12 space-y-4">
        <Link
          href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-block"
        >
          &larr; {artistName}
        </Link>
        <EmptyState icon={Disc3} title={`Album ${albumName} by ${artistName} was not found on Last.fm.`} />
      </PageContainer>
    )
  }

  // Normalise tracks array (Last.fm returns object when single track)
  const tracks: LfmTrack[] = (() => {
    const raw = albumInfo.tracks?.track
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    return [raw as LfmTrack]
  })()

  // Normalise tags array
  const tags: Array<{ name: string; url: string }> = (() => {
    const raw = albumInfo.tags?.tag
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    return [raw as { name: string; url: string }]
  })()

  const coverUrl = getBestImage(albumInfo.image, ['mega', 'extralarge', 'large', 'medium'])

  // User total plays
  let userPlaysLfm: number | null = null
  if (username && albumInfo.userplaycount !== undefined) {
    userPlaysLfm = Number(albumInfo.userplaycount)
  }

  // Prisma: scrobbles for this album
  const scrobbles =
    user
      ? await prisma.scrobble.findMany({
          where: {
            userId: user.id,
            album: { equals: albumName, mode: 'insensitive' },
          },
          orderBy: { scrobbledAt: 'asc' },
          select: { track: true, scrobbledAt: true },
        })
      : []

  const dbPlays = scrobbles.length
  // Prefer LFM userplaycount if available and > 0, fall back to DB count
  const userPlays = (userPlaysLfm !== null && userPlaysLfm > 0) ? userPlaysLfm : dbPlays

  const firstHeard = scrobbles[0]?.scrobbledAt ?? null
  const lastHeard = scrobbles[scrobbles.length - 1]?.scrobbledAt ?? null

  // Prisma: per-track play counts from DB
  const trackPlayCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    trackPlayCounts[s.track] = (trackPlayCounts[s.track] ?? 0) + 1
  }

  // TopAlbum rank from DB
  const topAlbumEntry = user
    ? await prisma.topAlbum.findFirst({
        where: {
          userId: user.id,
          name: { equals: albumName, mode: 'insensitive' },
          artist: { equals: artistName, mode: 'insensitive' },
          period: 'overall',
        },
        select: { rank: true, playcount: true },
      })
    : null

  // Monthly plays chart data
  const monthCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 7)
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  }
  const playsByMonth = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, label: month.slice(2), count }))

  // Tracklist completion
  const playedTrackNames = new Set(
    tracks
      .filter((t) => {
        const fromLfm = Number(t.userplaycount ?? 0)
        const fromDb = trackPlayCounts[t.name] ?? 0
        return fromLfm > 0 || fromDb > 0
      })
      .map((t) => t.name),
  )
  const completionCount = playedTrackNames.size
  const completionPct = tracks.length > 0 ? Math.round((completionCount / tracks.length) * 100) : 0

  // Wiki / bio
  const wikiText = albumInfo.wiki?.summary ? stripHtml(albumInfo.wiki.summary) : ''

  const releaseDate =
    albumInfo.wiki?.published?.trim() ??
    albumInfo.releasedate?.trim() ??
    null

  return (
    <main>
      <div className="container mx-auto px-4 max-w-[1400px] pt-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            {
              label: artistName,
              href: `/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`,
            },
            { label: albumName },
          ]}
        />
      </div>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '420px' }}>
        {/* Background: blurred cover or gradient */}
        {coverUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{
                backgroundImage: `url(${coverUrl})`,
                filter: 'blur(24px)',
                opacity: 0.35,
              }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
            <span className="text-[20rem] font-black leading-none select-none opacity-10 text-white">
              {albumName[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Bottom-up fade to page background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 40%, transparent) 40%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div
          className="relative container mx-auto px-4 max-w-[1400px] pt-6 pb-10 flex flex-col justify-end"
          style={{ minHeight: '420px' }}
        >
          <div className="flex flex-col sm:flex-row gap-6 items-end animate-fade-in-up">
            {/* Cover art thumbnail */}
            <div className="shrink-0 w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border border-foreground/10 shadow-2xl bg-muted">
              {coverUrl ? (
                <img src={coverUrl} alt={albumName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0 space-y-3 pb-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Album</p>
              <h1
                className="text-3xl sm:text-5xl font-black leading-tight break-words"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
              >
                {albumInfo.name}
              </h1>
              <Link
                href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                className="text-lg text-muted-foreground hover:text-foreground hover:underline transition-colors inline-block"
              >
                {albumInfo.artist}
              </Link>

              {releaseDate && (
                <p className="text-sm text-muted-foreground">{releaseDate}</p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((tag) => (
                    <Badge key={tag.name} variant="secondary" className="capitalize text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* External link + ListenOn */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {albumInfo.url && (
                  <a
                    href={albumInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Last.fm
                  </a>
                )}
                <ListenOn type="album" artist={artistName} album={albumName} variant="compact" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-[1400px] py-8 space-y-10">

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {Number(albumInfo.listeners) > 0 && (
            <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[110px]">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Users className="h-3 w-3" /> Listeners
              </div>
              <p className="text-xl font-bold tabular-nums">{fmtNum(albumInfo.listeners)}</p>
            </div>
          )}
          {Number(albumInfo.playcount) > 0 && (
            <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[110px]">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <PlayCircle className="h-3 w-3" /> Global Plays
              </div>
              <p className="text-xl font-bold tabular-nums">{fmtNum(albumInfo.playcount)}</p>
            </div>
          )}
          {username && userPlays > 0 && (
            <div
              className="rounded-2xl border border-primary/40 backdrop-blur-md px-4 py-3 min-w-[110px]"
              style={{ background: 'color-mix(in oklch, var(--primary) 12%, var(--card))' }}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Music2 className="h-3 w-3" /> Your Plays
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {fmtNum(userPlays)}
              </p>
            </div>
          )}
          {topAlbumEntry && (
            <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[110px]">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Disc3 className="h-3 w-3" /> Your Album Rank
              </div>
              <p className="text-xl font-bold tabular-nums">#{topAlbumEntry.rank}</p>
            </div>
          )}
          {username && firstHeard && (
            <div className="rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl px-4 py-3 min-w-[130px]">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CheckCircle2 className="h-3 w-3" /> First Listened
              </div>
              <p className="text-base font-bold">{fmtDate(firstHeard)}</p>
            </div>
          )}
        </div>

        {/* ── Tracklist ───────────────────────────────────────────────── */}
        {tracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-transparent">
                <Music2 className="h-5 w-5 text-foreground" /> Tracklist
              </h2>
              {username && tracks.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {completionCount} of {tracks.length} tracks played
                  </span>
                  <div
                    className="w-28 h-2 rounded-full overflow-hidden"
                    style={{ background: 'color-mix(in oklch, var(--muted) 80%, transparent)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${completionPct}%`,
                        background: 'var(--primary)',
                        minWidth: completionCount > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                    {completionPct}%
                  </span>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <ol>
                  {tracks.map((track, i) => {
                    const rank = track['@attr']?.rank ? Number(track['@attr'].rank) : i + 1
                    const duration = fmtDuration(track.duration)
                    const lfmPlays = track.userplaycount ? Number(track.userplaycount) : null
                    const dbTrackPlays = trackPlayCounts[track.name] ?? 0
                    const trackPlays = (lfmPlays !== null && lfmPlays > 0) ? lfmPlays : (dbTrackPlays > 0 ? dbTrackPlays : null)
                    const hasPlayed = trackPlays !== null && trackPlays > 0

                    return (
                      <li
                        key={`${track.name}-${i}`}
                        className="flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-colors group"
                        style={
                          hasPlayed
                            ? { background: 'color-mix(in oklch, var(--primary) 5%, transparent)' }
                            : undefined
                        }
                      >
                        <span className="text-muted-foreground text-sm w-6 text-right shrink-0 tabular-nums">
                          {rank}
                        </span>
                        <span className="flex-1 text-sm font-medium truncate">
                          <Link
                            href={`/track/${encodeURIComponent(artistName)}/${encodeURIComponent(track.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                            className="hover:underline"
                          >
                            {track.name}
                          </Link>
                        </span>
                        <div className="flex items-center gap-4 shrink-0">
                          {username && trackPlays !== null && trackPlays > 0 && (
                            <span
                              className="text-xs font-semibold tabular-nums"
                              style={{ color: 'var(--primary)' }}
                            >
                              {fmtNum(trackPlays)} plays
                            </span>
                          )}
                          {duration && (
                            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                              {duration}
                            </span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Your Stats + Play history ────────────────────────────────── */}
        {username && (dbPlays > 0 || userPlays > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Music2 className="h-4 w-4" /> Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total plays</span>
                  <span className="font-semibold">{fmtNum(userPlays)}</span>
                </div>
                {topAlbumEntry && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Album rank (all time)</span>
                    <span className="font-semibold">#{topAlbumEntry.rank}</span>
                  </div>
                )}
                {firstHeard && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">First heard</span>
                    <span className="font-semibold">{fmtDate(firstHeard)}</span>
                  </div>
                )}
                {lastHeard && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last heard</span>
                    <span className="font-semibold">{fmtDate(lastHeard)}</span>
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
                {tracks.length > 0 && username && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-semibold">{completionPct}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {playsByMonth.length > 0 && (
              <div className="md:col-span-2">
                <ArtistChart data={playsByMonth} title={`Your "${albumName}" History`} />
              </div>
            )}
          </div>
        )}

        {/* ── Wiki / About ─────────────────────────────────────────────── */}
        {wikiText && (
          <ArtistBio bio={wikiText} />
        )}

        {/* ── More Albums by Artist ────────────────────────────────────── */}
        {relatedAlbums.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Disc3 className="h-5 w-5" /> More by {artistName}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {relatedAlbums.map((album) => {
                const img = getBestImage(album.image, ['extralarge', 'large', 'medium'])
                return (
                  <Link
                    key={album.name}
                    href={`/album/${encodeURIComponent(artistName)}/${encodeURIComponent(album.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-foreground/10 mb-2 shadow-lg shadow-black/5 dark:shadow-black/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                      {img ? (
                        <img src={img} alt={album.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {Number(album.playcount) > 0 && (
                        <>
                          <div
                            className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
                            style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-1.5 pointer-events-none">
                            <span className="text-white/90 text-[10px] font-semibold tabular-nums leading-none">
                              {fmtNum(album.playcount)}
                            </span>
                            <PlayCircle className="h-3 w-3 text-white/70" />
                          </div>
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    </div>
                    <p className="text-sm font-medium truncate leading-tight group-hover:underline">
                      {album.name}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── No user state ────────────────────────────────────────────── */}
        {!username && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <EmptyState
                icon={User}
                title="Sign in or add ?username=yourname to see your personal play counts and stats."
                action={{ label: 'Sign in', href: '/login' }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
