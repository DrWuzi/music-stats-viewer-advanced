import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { Disc3, PlayCircle, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Album {
  name: string
  playcount: string
  url: string
  image: Array<{ '#text': string; size: string }>
  mbid?: string
}

type SortKey = 'plays' | 'name' | 'user_plays'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

function getBestImage(
  images: Array<{ '#text': string; size: string }>,
  preferred = ['extralarge', 'large', 'medium', 'small'],
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

// ─── Last.fm fetch ────────────────────────────────────────────────────────────

async function fetchAllAlbums(artistName: string): Promise<Album[]> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getTopAlbums&artist=${encodeURIComponent(artistName)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=50`,
      { next: { revalidate: 3600 } },
    )
    const data = await res.json()
    if (data.error) return []
    return (data.topalbums?.album ?? []).map(
      (a: { name: string; playcount: string; url: string; image: unknown[]; mbid?: string }) => ({
        name: a.name,
        playcount: a.playcount,
        url: a.url,
        image: (a.image ?? []) as Array<{ '#text': string; size: string }>,
        mbid: a.mbid,
      }),
    )
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ name: string }>
  searchParams?: Promise<{ sort?: string; username?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params
  const artistName = decodeURIComponent(name)
  return { title: `${artistName} — Full Discography — Last.fm Advanced` }
}

export default async function DiscographyPage({ params, searchParams }: Props) {
  const { name } = await params
  const sp = await searchParams
  const artistName = decodeURIComponent(name)
  const sortKey = (sp?.sort as SortKey | undefined) ?? 'plays'

  const session = await getSession()
  const username = sp?.username ?? session?.lastfmUsername

  // Fetch albums + user in parallel
  const [albums, user] = await Promise.all([
    fetchAllAlbums(artistName),
    username ? prisma.user.findUnique({ where: { lastfmUsername: username } }) : null,
  ])

  // User album play counts from TopAlbum table (overall period)
  let userAlbumPlays: Record<string, number> = {}
  if (user) {
    const rows = await prisma.topAlbum.findMany({
      where: {
        userId: user.id,
        artist: { equals: artistName, mode: 'insensitive' },
        period: 'overall',
      },
      select: { name: true, playcount: true },
    })
    for (const row of rows) {
      userAlbumPlays[row.name.toLowerCase()] = row.playcount
    }

    // Also try from scrobbles as a fallback / supplement
    const scrobbleAlbumCounts = await prisma.scrobble.groupBy({
      by: ['album'],
      where: {
        userId: user.id,
        artist: { equals: artistName, mode: 'insensitive' },
        album: { not: null },
      },
      _count: { _all: true },
    })
    for (const row of scrobbleAlbumCounts) {
      if (!row.album) continue
      const key = row.album.toLowerCase()
      // Prefer TopAlbum data if available, otherwise use scrobble count
      if (!userAlbumPlays[key]) {
        userAlbumPlays[key] = row._count._all
      }
    }
  }

  // Sort
  const sortedAlbums = [...albums].sort((a, b) => {
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortKey === 'user_plays') {
      const aUp = userAlbumPlays[a.name.toLowerCase()] ?? 0
      const bUp = userAlbumPlays[b.name.toLowerCase()] ?? 0
      return bUp - aUp
    }
    // default: plays (global)
    return Number(b.playcount) - Number(a.playcount)
  })

  const totalGlobalPlays = albums.reduce((sum, a) => sum + Number(a.playcount), 0)
  const totalUserPlays = Object.values(userAlbumPlays).reduce((sum, n) => sum + n, 0)

  function sortLink(key: SortKey) {
    const params = new URLSearchParams()
    params.set('sort', key)
    if (username) params.set('username', username)
    return `?${params.toString()}`
  }

  function artistLink() {
    const base = `/artist/${encodeURIComponent(name)}`
    return username ? `${base}?username=${encodeURIComponent(username)}` : base
  }

  return (
    <main className="container mx-auto px-4 max-w-[1400px] py-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Artists' },
          { label: artistName, href: artistLink() },
          { label: 'Discography' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Artist</p>
          <h1 className="text-3xl font-black tracking-tight">
            <Link href={artistLink()} className="hover:underline">
              {artistName}
            </Link>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Full Discography — {albums.length} album{albums.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Global Plays</p>
            <p className="text-lg font-bold tabular-nums">{fmtNum(totalGlobalPlays)}</p>
          </div>
          {username && totalUserPlays > 0 && (
            <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Your Plays</p>
              <p className="text-lg font-bold text-primary tabular-nums">{fmtNum(totalUserPlays)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(
          [
            { key: 'plays', label: 'Global Plays' },
            { key: 'name', label: 'Name' },
            ...(username ? [{ key: 'user_plays', label: 'Your Plays' }] : []),
          ] as { key: SortKey; label: string }[]
        ).map(({ key, label }) => (
          <Link key={key} href={sortLink(key)}>
            <Badge
              variant={sortKey === key ? 'default' : 'secondary'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {label}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Albums grid */}
      {albums.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Disc3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No albums found for {artistName}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedAlbums.map((album) => {
            const albumImg = getBestImage(album.image)
            const userPlays = userAlbumPlays[album.name.toLowerCase()]
            const albumHref = `/album/${encodeURIComponent(artistName)}/${encodeURIComponent(album.name)}`

            return (
              <Link
                key={album.name}
                href={albumHref}
                className="group cursor-pointer"
              >
                {/* Cover art */}
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

                  {/* Bottom gradient + global play count */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)',
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 pb-2 pointer-events-none">
                    <span className="text-white/90 text-[10px] font-semibold tabular-nums leading-none">
                      {fmtNum(album.playcount)}
                    </span>
                    <PlayCircle className="h-3 w-3 text-white/70" />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-semibold tracking-wide drop-shadow">
                      View album →
                    </span>
                  </div>
                </div>

                {/* Album name */}
                <p className="text-sm font-medium truncate leading-tight group-hover:underline">
                  {album.name}
                </p>

                {/* Global plays */}
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {fmtNum(album.playcount)} plays
                </p>

                {/* User plays */}
                {userPlays != null && userPlays > 0 && (
                  <p className="text-xs text-primary font-medium mt-0.5 tabular-nums">
                    {fmtNum(userPlays)} your plays
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4 border-t border-border">
        <Link
          href={artistLink()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          ← Back to {artistName}
        </Link>
      </div>
    </main>
  )
}
