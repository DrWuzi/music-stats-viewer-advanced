import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistChart } from '@/components/artist-chart'

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

  if (!username) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">
          Sign in or pass <code>?username=X</code> to view artist data.
        </p>
      </main>
    )
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">
          User <strong>{username}</strong> not found. Visit their profile first to sync data.
        </p>
      </main>
    )
  }

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id, artist: { equals: artistName, mode: 'insensitive' } },
    orderBy: { scrobbledAt: 'asc' },
    select: { track: true, album: true, scrobbledAt: true },
  })

  if (!scrobbles.length) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href={`/user/${encodeURIComponent(username)}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
        >
          ← {username}&apos;s profile
        </Link>
        <p className="text-muted-foreground mt-4">
          No scrobbles found for <strong>{artistName}</strong>.
        </p>
      </main>
    )
  }

  const totalPlays = scrobbles.length
  const firstHeard = scrobbles[0].scrobbledAt
  const lastHeard = scrobbles[scrobbles.length - 1].scrobbledAt

  // Top tracks
  const trackCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    trackCounts[s.track] = (trackCounts[s.track] ?? 0) + 1
  }
  const topTracks = Object.entries(trackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Top albums
  const albumCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    if (s.album) {
      albumCounts[s.album] = (albumCounts[s.album] ?? 0) + 1
    }
  }
  const topAlbums = Object.entries(albumCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Plays by month
  const monthCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 7)
    monthCounts[key] = (monthCounts[key] ?? 0) + 1
  }
  const playsByMonth = Object.entries(monthCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, label: month.slice(2), count }))

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/user/${encodeURIComponent(username)}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {username}&apos;s profile
        </Link>
        <h1 className="text-3xl font-bold mt-2">{artistName}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPlays.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">First Heard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{fmt(firstHeard)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Heard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{fmt(lastHeard)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plays by month chart */}
      <ArtistChart data={playsByMonth} title="Plays by Month" />

      {/* Top Tracks + Top Albums */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            {topTracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No track data.</p>
            ) : (
              <ol className="space-y-2">
                {topTracks.map(([track, count], i) => (
                  <li key={track} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{track}</span>
                    <span className="text-sm font-medium shrink-0">{count}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Albums</CardTitle>
          </CardHeader>
          <CardContent>
            {topAlbums.length === 0 ? (
              <p className="text-sm text-muted-foreground">No album data.</p>
            ) : (
              <ol className="space-y-2">
                {topAlbums.map(([album, count], i) => (
                  <li key={album} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <Link
                      href={`/album/${encodeURIComponent(artistName)}/${encodeURIComponent(album)}?username=${encodeURIComponent(username)}`}
                      className="flex-1 text-sm truncate hover:underline"
                    >
                      {album}
                    </Link>
                    <span className="text-sm font-medium shrink-0">{count}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
