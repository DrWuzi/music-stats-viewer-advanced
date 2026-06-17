import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{ year?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s Wrapped — Last.fm Advanced` }
}

export default async function WrappedPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const year = Number(sp?.year ?? currentYear)

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

  if (!user) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-destructive text-lg">User not found</p>
          <Link href="/" className="text-primary underline mt-4 inline-block">
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const scrobbles = await prisma.scrobble.findMany({
    where: {
      userId: user.id,
      scrobbledAt: { gte: yearStart, lt: yearEnd },
    },
    orderBy: { scrobbledAt: 'asc' },
  })

  const totalScrobbles = scrobbles.length

  // Top 5 artists
  const artistCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    artistCounts[s.artist] = (artistCounts[s.artist] ?? 0) + 1
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top 5 tracks
  const trackCounts: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = `${s.track}|||${s.artist}`
    trackCounts[key] = (trackCounts[key] ?? 0) + 1
  }
  const topTracks = Object.entries(trackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [track, artist] = key.split('|||')
      return { track, artist, count }
    })

  // Most active month
  const monthCounts: Record<number, number> = {}
  for (const s of scrobbles) {
    const month = s.scrobbledAt.getMonth()
    monthCounts[month] = (monthCounts[month] ?? 0) + 1
  }
  const mostActiveMonthNum =
    totalScrobbles > 0
      ? Number(Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
      : null
  const mostActiveMonthName =
    mostActiveMonthNum !== null
      ? new Date(year, mostActiveMonthNum, 1).toLocaleString('en-US', { month: 'long' })
      : null
  const mostActiveMonthCount =
    mostActiveMonthNum !== null ? monthCounts[mostActiveMonthNum] : 0

  const firstScrobble = scrobbles[0] ?? null
  const lastScrobble = scrobbles[scrobbles.length - 1] ?? null

  const firstYear = user.createdAt.getFullYear()
  const yearRange: number[] = []
  for (let y = firstYear; y <= currentYear; y++) {
    yearRange.push(y)
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href={`/user/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block"
          >
            ← Back to profile
          </Link>
          <h1 className="text-3xl font-bold">{username}&apos;s Wrapped</h1>
        </div>

        {/* Year selector */}
        <div className="flex flex-wrap gap-2">
          {yearRange.map((y) => (
            <Link key={y} href={`/user/${username}/wrapped?year=${y}`}>
              <Badge variant={y === year ? 'default' : 'outline'} className="cursor-pointer text-sm px-3 py-1">
                {y}
              </Badge>
            </Link>
          ))}
        </div>

        {totalScrobbles === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">No scrobbles found for {year}.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero total */}
            <div className="rounded-2xl bg-foreground text-background p-8 text-center space-y-2">
              <p className="text-sm uppercase tracking-widest opacity-70">{year} in Music</p>
              <p className="text-7xl font-black">{totalScrobbles.toLocaleString()}</p>
              <p className="text-xl opacity-80">scrobbles</p>
              {mostActiveMonthName && (
                <p className="text-sm opacity-60 mt-2">
                  Most active month: {mostActiveMonthName} ({mostActiveMonthCount?.toLocaleString()} plays)
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Top Artists */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Artists</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {topArtists.map(([artist, count], i) => (
                      <li key={artist} className="flex items-center gap-3">
                        <span className="text-2xl font-black text-muted-foreground w-7 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{artist}</p>
                          <p className="text-sm text-muted-foreground">
                            {count.toLocaleString()} plays
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Top Tracks */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Tracks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {topTracks.map(({ track, artist, count }, i) => (
                      <li key={`${track}-${artist}`} className="flex items-center gap-3">
                        <span className="text-2xl font-black text-muted-foreground w-7 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{track}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {artist} &middot; {count.toLocaleString()} plays
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>

            {/* First & Last */}
            {(firstScrobble || lastScrobble) && (
              <Card>
                <CardHeader>
                  <CardTitle>Year Bookmarks</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {firstScrobble && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        First scrobble of {year}
                      </p>
                      <p className="font-semibold">{firstScrobble.track}</p>
                      <p className="text-sm text-muted-foreground">{firstScrobble.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {firstScrobble.scrobbledAt.toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  )}
                  {lastScrobble && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Last scrobble of {year}
                      </p>
                      <p className="font-semibold">{lastScrobble.track}</p>
                      <p className="text-sm text-muted-foreground">{lastScrobble.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {lastScrobble.scrobbledAt.toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  )
}
