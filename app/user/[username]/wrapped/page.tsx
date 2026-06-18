import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WrappedClient } from '@/components/wrapped-client'

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
    select: { artist: true, album: true, track: true, scrobbledAt: true },
  })

  const totalScrobbles = scrobbles.length

  // Unique artists and tracks
  const artistSet = new Set<string>()
  const trackSet = new Set<string>()
  const artistCounts: Record<string, number> = {}
  const trackCounts: Record<string, { artist: string; count: number }> = {}

  // Night owl: plays at hour >= 22
  let nightOwlCount = 0
  // Weekend: plays on Sat (6) or Sun (0)
  let weekendCount = 0

  // Day-based streak
  const daySet = new Set<string>()

  for (const s of scrobbles) {
    artistSet.add(s.artist)
    const trackKey = `${s.track}|||${s.artist}`
    trackSet.add(trackKey)

    artistCounts[s.artist] = (artistCounts[s.artist] ?? 0) + 1

    if (!trackCounts[trackKey]) {
      trackCounts[trackKey] = { artist: s.artist, count: 0 }
    }
    trackCounts[trackKey].count += 1

    const d = new Date(s.scrobbledAt)
    const hour = d.getHours()
    const dow = d.getDay()
    if (hour >= 22) nightOwlCount++
    if (dow === 0 || dow === 6) weekendCount++

    const dayKey = d.toISOString().slice(0, 10)
    daySet.add(dayKey)
  }

  const uniqueArtists = artistSet.size
  const uniqueTracks = trackSet.size

  const nightOwlPct =
    totalScrobbles > 0 ? Math.round((nightOwlCount / totalScrobbles) * 100) : 0
  const weekendPct =
    totalScrobbles > 0 ? Math.round((weekendCount / totalScrobbles) * 100) : 0

  // Estimated minutes: assume avg track length 3.5 minutes
  const totalMinutesEst = Math.round(totalScrobbles * 3.5)

  // Top artist from scrobbles
  const topArtistEntry = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const topArtist = topArtistEntry
    ? { name: topArtistEntry[0], playcount: topArtistEntry[1] }
    : null

  // Top track from scrobbles
  const topTrackEntry = Object.entries(trackCounts).sort(
    (a, b) => b[1].count - a[1].count
  )[0] ?? null
  const topTrack = topTrackEntry
    ? {
        name: topTrackEntry[0].split('|||')[0],
        artist: topTrackEntry[1].artist,
        playcount: topTrackEntry[1].count,
      }
    : null

  // Top album from TopAlbum table (overall period)
  const topAlbumRecord = await prisma.topAlbum.findFirst({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
  })
  const topAlbum = topAlbumRecord
    ? { name: topAlbumRecord.name, artist: topAlbumRecord.artist, playcount: topAlbumRecord.playcount }
    : null

  // Longest streak: consecutive days with at least 1 scrobble
  const sortedDays = Array.from(daySet).sort()
  let longestStreak = 0
  let currentStreak = 0
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffMs = curr.getTime() - prev.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak
  }

  // Year range for selector
  const firstYear = user.createdAt.getFullYear()
  const yearRange: number[] = []
  for (let y = firstYear; y <= currentYear; y++) {
    yearRange.push(y)
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
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
              <Badge
                variant={y === year ? 'default' : 'outline'}
                className="cursor-pointer text-sm px-3 py-1"
              >
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
          <WrappedClient
            username={username}
            year={year}
            totalScrobbles={totalScrobbles}
            uniqueArtists={uniqueArtists}
            uniqueTracks={uniqueTracks}
            topArtist={topArtist}
            topTrack={topTrack}
            topAlbum={topAlbum}
            longestStreak={longestStreak}
            nightOwlPct={nightOwlPct}
            weekendPct={weekendPct}
            totalMinutesEst={totalMinutesEst}
          />
        )}
      </div>
    </main>
  )
}
