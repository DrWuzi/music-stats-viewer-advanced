import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { WrappedYearSummary } from '@/components/wrapped-year-summary'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{ year?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s Wrapped — Last.fm Advanced` }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default async function WrappedPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const year = Number(sp?.year ?? currentYear - 1)

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

  if (!user) {
    return (
      <main className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg" style={{ color: 'var(--destructive)' }}>User not found</p>
          <Link href="/" className="underline mt-4 inline-block" style={{ color: 'var(--primary)' }}>
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

  // Day-based streak and peak day
  const daySet = new Set<string>()
  const dayCounts: Record<string, number> = {}

  // Monthly counts
  const monthCounts: Record<number, number> = {}

  // Hour counts for favorite hour
  const hourCounts: Record<number, number> = {}

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
    const month = d.getMonth() // 0-indexed
    if (hour >= 22) nightOwlCount++

    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
    monthCounts[month] = (monthCounts[month] ?? 0) + 1

    const dayKey = d.toISOString().slice(0, 10)
    daySet.add(dayKey)
    dayCounts[dayKey] = (dayCounts[dayKey] ?? 0) + 1
  }

  const uniqueArtists = artistSet.size
  const uniqueTracks = trackSet.size
  const nightOwlPct = totalScrobbles > 0 ? Math.round((nightOwlCount / totalScrobbles) * 100) : 0
  const totalMinutesEst = Math.round(totalScrobbles * 3.5)

  // Top artist
  const topArtistEntry = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const topArtist = topArtistEntry
    ? { name: topArtistEntry[0], playcount: topArtistEntry[1] }
    : null

  // Top track
  const topTrackEntry = Object.entries(trackCounts).sort((a, b) => b[1].count - a[1].count)[0] ?? null
  const topTrack = topTrackEntry
    ? {
        name: topTrackEntry[0].split('|||')[0],
        artist: topTrackEntry[1].artist,
        playcount: topTrackEntry[1].count,
      }
    : null

  // Top album from TopAlbum table (12month period preferred, fall back to overall)
  const topAlbumRecord = await prisma.topAlbum.findFirst({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
  })
  const topAlbum = topAlbumRecord
    ? { name: topAlbumRecord.name, artist: topAlbumRecord.artist, playcount: topAlbumRecord.playcount }
    : null

  // Longest streak
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

  // Peak day
  const peakDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const peakDay = peakDayEntry ? { date: peakDayEntry[0], count: peakDayEntry[1] } : null

  // Most active month
  const mostActiveMonthEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const mostActiveMonth = mostActiveMonthEntry
    ? { month: MONTH_NAMES[Number(mostActiveMonthEntry[0])], count: mostActiveMonthEntry[1] }
    : null

  // Favorite hour (mode)
  const favoriteHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0] ?? null
  const favoriteHour = favoriteHourEntry !== null ? Number(favoriteHourEntry[0]) : null

  // First and last scrobble
  const firstScrobbleRaw = scrobbles.length > 0 ? scrobbles[0] : null
  const lastScrobbleRaw = scrobbles.length > 0 ? scrobbles[scrobbles.length - 1] : null

  function formatScrobbleDate(d: Date): string {
    return d.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const firstScrobble = firstScrobbleRaw
    ? {
        track: firstScrobbleRaw.track,
        artist: firstScrobbleRaw.artist,
        date: formatScrobbleDate(new Date(firstScrobbleRaw.scrobbledAt)),
      }
    : null

  const lastScrobble = lastScrobbleRaw
    ? {
        track: lastScrobbleRaw.track,
        artist: lastScrobbleRaw.artist,
        date: formatScrobbleDate(new Date(lastScrobbleRaw.scrobbledAt)),
      }
    : null

  // Year range for selector
  const firstYear = user.createdAt.getFullYear()
  const yearRange: number[] = []
  for (let y = firstYear; y < currentYear; y++) {
    yearRange.push(y)
  }
  if (yearRange.length === 0) yearRange.push(currentYear - 1)

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link
            href={`/user/${username}`}
            className="text-sm mb-4 inline-block transition-colors hover:opacity-80"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ← Back to profile
          </Link>
        </div>

        {totalScrobbles === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
                No scrobbles found for {year}.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
                Try selecting a different year below.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {yearRange.map((y) => (
                  <Link key={y} href={`/user/${username}/wrapped?year=${y}`}>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border cursor-pointer transition-all hover:scale-105"
                      style={{
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                        background: y === year ? 'var(--primary)' : 'transparent',
                      }}
                    >
                      {y}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <WrappedYearSummary
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
            weekendPct={0}
            totalMinutesEst={totalMinutesEst}
            peakDay={peakDay}
            mostActiveMonth={mostActiveMonth}
            favoriteHour={favoriteHour}
            firstScrobble={firstScrobble}
            lastScrobble={lastScrobble}
            yearRange={yearRange}
          />
        )}
      </div>
    </main>
  )
}
