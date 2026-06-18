import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Disc3, Music2, ExternalLink, PlayCircle } from 'lucide-react'

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
  wiki?: { published?: string; summary?: string }
  tracks?: { track?: LfmTrack[] }
  tags?: { tag?: Array<{ name: string; url: string }> }
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

  const albumInfo = await fetchAlbumInfo(artistName, albumName, username ?? undefined)

  if (!albumInfo) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Link
          href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-block"
        >
          ← {artistName}
        </Link>
        <p className="text-muted-foreground">
          Album <strong>{albumName}</strong> by <strong>{artistName}</strong> was not found on Last.fm.
        </p>
      </main>
    )
  }

  const coverUrl = getBestImage(albumInfo.image, ['mega', 'extralarge', 'large', 'medium'])

  const tracks: LfmTrack[] = Array.isArray(albumInfo.tracks?.track)
    ? albumInfo.tracks!.track!
    : albumInfo.tracks?.track
      ? [albumInfo.tracks.track as unknown as LfmTrack]
      : []

  const tags = albumInfo.tags?.tag ?? []

  // User total plays: prefer userplaycount field; fallback to sum of track userplaycounts
  let userPlays: number | null = null
  if (username) {
    if (albumInfo.userplaycount !== undefined && albumInfo.userplaycount !== '0') {
      userPlays = Number(albumInfo.userplaycount)
    } else if (tracks.some((t) => t.userplaycount)) {
      userPlays = tracks.reduce((acc, t) => acc + Number(t.userplaycount ?? 0), 0)
    }
  }

  const releaseDate =
    albumInfo.wiki?.published ??
    albumInfo.releasedate?.trim()

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Back link ── */}
      <Link
        href={`/artist/${encodeURIComponent(artistName)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
        className="text-sm text-muted-foreground hover:text-foreground inline-block"
      >
        ← {artistName}
      </Link>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Cover art */}
        <div className="shrink-0 w-40 h-40 sm:w-52 sm:h-52 rounded-xl overflow-hidden bg-muted border border-border shadow-md">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={albumName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Album</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight break-words">{albumInfo.name}</h1>
          <p className="text-lg text-muted-foreground">{albumInfo.artist}</p>

          {releaseDate && (
            <p className="text-sm text-muted-foreground">{releaseDate}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.slice(0, 8).map((tag) => (
                <Badge key={tag.name} variant="secondary" className="capitalize text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* External link */}
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
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Number(albumInfo.listeners) > 0 && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Listeners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmtNum(albumInfo.listeners)}</p>
            </CardContent>
          </Card>
        )}
        {Number(albumInfo.playcount) > 0 && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <PlayCircle className="h-3 w-3" /> Global Plays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmtNum(albumInfo.playcount)}</p>
            </CardContent>
          </Card>
        )}
        {username && userPlays !== null && userPlays > 0 && (
          <Card className="border-primary/40" style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))' }}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Music2 className="h-3 w-3" /> Your Plays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {fmtNum(userPlays)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Tracklist ── */}
      {tracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-4 w-4" />
              Tracklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ol>
              {tracks.map((track, i) => {
                const rank = track['@attr']?.rank ? Number(track['@attr'].rank) : i + 1
                const duration = fmtDuration(track.duration)
                const plays = track.userplaycount ? Number(track.userplaycount) : null

                return (
                  <li
                    key={`${track.name}-${i}`}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors group"
                  >
                    <span className="text-muted-foreground text-sm w-6 text-right shrink-0 tabular-nums">
                      {rank}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {track.url ? (
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {track.name}
                        </a>
                      ) : (
                        track.name
                      )}
                    </span>
                    <div className="flex items-center gap-4 shrink-0">
                      {plays !== null && plays > 0 && username && (
                        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                          {fmtNum(plays)} plays
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
      )}

      {/* ── No user data state ── */}
      {!username && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline">Sign in</Link> or add{' '}
            <code className="bg-muted px-1 rounded text-xs">?username=yourname</code> to see your personal play counts.
          </CardContent>
        </Card>
      )}
    </main>
  )
}
