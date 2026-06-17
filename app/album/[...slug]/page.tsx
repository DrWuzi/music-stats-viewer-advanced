import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  params: Promise<{ slug: string[] }>
  searchParams?: Promise<{ username?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const [, albumName] = (slug ?? []).map(decodeURIComponent)
  return { title: (albumName ?? 'Album') + ' — Last.fm Advanced' }
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [artistName, albumName] = (slug ?? []).map(decodeURIComponent)

  if (!artistName || !albumName) {
    notFound()
  }

  const session = await getSession()
  const username = sp?.username ?? session?.lastfmUsername

  if (!username) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">
          Sign in or pass <code>?username=X</code> to view album data.
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
    where: {
      userId: user.id,
      artist: { equals: artistName, mode: 'insensitive' },
      album: { equals: albumName, mode: 'insensitive' },
    },
    orderBy: { scrobbledAt: 'asc' },
    select: { track: true, scrobbledAt: true },
  })

  if (!scrobbles.length) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href={`/artist/${encodeURIComponent(artistName)}?username=${encodeURIComponent(username)}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
        >
          ← {artistName}
        </Link>
        <p className="text-muted-foreground mt-4">
          No scrobbles found for <strong>{albumName}</strong> by <strong>{artistName}</strong>.
        </p>
      </main>
    )
  }

  const totalPlays = scrobbles.length
  const firstHeard = scrobbles[0].scrobbledAt
  const lastHeard = scrobbles[scrobbles.length - 1].scrobbledAt

  // Track listing grouped by name with counts
  const trackCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    trackCounts[s.track] = (trackCounts[s.track] ?? 0) + 1
  }
  const tracks = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/artist/${encodeURIComponent(artistName)}?username=${encodeURIComponent(username)}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {artistName}
        </Link>
        <h1 className="text-3xl font-bold mt-2">{albumName}</h1>
        <p className="text-muted-foreground mt-1">{artistName}</p>
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

      {/* Track listing */}
      <Card>
        <CardHeader>
          <CardTitle>Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          {tracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No track data.</p>
          ) : (
            <ol className="space-y-2">
              {tracks.map(([track, count], i) => (
                <li key={track} className="flex items-center gap-3 py-1 border-b last:border-0">
                  <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{track}</span>
                  <span className="text-sm font-medium shrink-0">
                    {count} {count === 1 ? 'play' : 'plays'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
