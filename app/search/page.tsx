import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type Props = {
  searchParams?: Promise<{ q?: string; username?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp?.q ?? ''
  const username = sp?.username ?? ''

  let artists: string[] = []
  let tracks: { track: string; artist: string }[] = []
  let albums: { album: string; artist: string }[] = []
  let notFound = false

  if (q.trim() && username.trim()) {
    const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

    if (!user) {
      notFound = true
    } else {
      const userId = user.id

      const artistRows = await prisma.scrobble.findMany({
        where: { userId, artist: { contains: q, mode: 'insensitive' } },
        select: { artist: true },
        distinct: ['artist'],
        take: 10,
      })

      const trackRows = await prisma.scrobble.findMany({
        where: {
          userId,
          OR: [
            { track: { contains: q, mode: 'insensitive' } },
            { artist: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { track: true, artist: true },
        distinct: ['track', 'artist'],
        take: 10,
      })

      const albumRows = await prisma.scrobble.findMany({
        where: {
          userId,
          album: { contains: q, mode: 'insensitive' },
          NOT: { album: null },
        },
        select: { album: true, artist: true },
        distinct: ['album', 'artist'],
        take: 10,
      })

      artists = artistRows.map((r) => r.artist)
      tracks = trackRows.map((r) => ({ track: r.track, artist: r.artist }))
      albums = albumRows
        .filter((r) => r.album !== null)
        .map((r) => ({ album: r.album as string, artist: r.artist }))
    }
  }

  const hasResults = artists.length > 0 || tracks.length > 0 || albums.length > 0
  const didSearch = q.trim() !== '' && username.trim() !== ''

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Scrobbles</h1>

      <form method="GET" action="/search" className="flex flex-col gap-3 mb-8">
        <input
          type="text"
          name="username"
          defaultValue={username}
          placeholder="Last.fm username"
          required
          className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search artists, tracks, albums..."
            required
            className="border rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {notFound && (
        <p className="text-muted-foreground text-sm">User &quot;{username}&quot; not found.</p>
      )}

      {didSearch && !notFound && !hasResults && (
        <p className="text-muted-foreground text-sm">No results for &quot;{q}&quot;</p>
      )}

      {hasResults && (
        <div className="space-y-8">
          {artists.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Artists</h2>
              <ul className="space-y-1">
                {artists.map((artist) => (
                  <li key={artist}>
                    <Link
                      href={`/artist/${encodeURIComponent(artist)}?username=${encodeURIComponent(username)}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {artist}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tracks.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Tracks</h2>
              <ul className="space-y-1">
                {tracks.map((t) => (
                  <li key={`${t.track}-${t.artist}`} className="text-sm">
                    <span className="font-medium">{t.track}</span>
                    <span className="text-muted-foreground"> — {t.artist}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Albums</h2>
              <ul className="space-y-1">
                {albums.map((a) => (
                  <li key={`${a.album}-${a.artist}`} className="text-sm">
                    <span className="font-medium">{a.album}</span>
                    <span className="text-muted-foreground"> — {a.artist}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
