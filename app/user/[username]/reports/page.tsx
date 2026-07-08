import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareReportButton } from '@/components/share-report-button'
import { ArtistImage } from '@/components/artist-image'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Reports — Last.fm Advanced` }
}

function getWeekBounds(offsetWeeks = 0): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff - offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function getMonthBounds(offsetMonths = 0): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1)
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function topArtistsFromScrobbles(
  scrobbles: { artist: string }[],
  n = 5,
): { name: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const s of scrobbles) {
    counts[s.artist] = (counts[s.artist] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, count]) => ({ name, count }))
}

function uniqueArtistCount(scrobbles: { artist: string }[]): number {
  return new Set(scrobbles.map((s) => s.artist)).size
}

export default async function ReportsPage({ params }: Props) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })
  if (!user) notFound()

  const allScrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { scrobbledAt: true, artist: true, track: true },
    orderBy: { scrobbledAt: 'desc' },
  })

  // Week calculations
  const thisWeek = getWeekBounds(0)
  const lastWeek = getWeekBounds(1)
  const thisMonth = getMonthBounds(0)
  const lastMonth = getMonthBounds(1)

  const thisWeekScrobbles = allScrobbles.filter(
    (s) => s.scrobbledAt >= thisWeek.start && s.scrobbledAt <= thisWeek.end,
  )
  const lastWeekScrobbles = allScrobbles.filter(
    (s) => s.scrobbledAt >= lastWeek.start && s.scrobbledAt <= lastWeek.end,
  )
  const thisMonthScrobbles = allScrobbles.filter(
    (s) => s.scrobbledAt >= thisMonth.start && s.scrobbledAt <= thisMonth.end,
  )
  const lastMonthScrobbles = allScrobbles.filter(
    (s) => s.scrobbledAt >= lastMonth.start && s.scrobbledAt <= lastMonth.end,
  )

  const weekChange =
    lastWeekScrobbles.length === 0
      ? null
      : Math.round(((thisWeekScrobbles.length - lastWeekScrobbles.length) / lastWeekScrobbles.length) * 100)

  const monthChange =
    lastMonthScrobbles.length === 0
      ? null
      : Math.round(((thisMonthScrobbles.length - lastMonthScrobbles.length) / lastMonthScrobbles.length) * 100)

  const thisWeekTopArtists = topArtistsFromScrobbles(thisWeekScrobbles, 5)
  const lastWeekTopArtists = topArtistsFromScrobbles(lastWeekScrobbles, 5)
  const thisMonthTopArtists = topArtistsFromScrobbles(thisMonthScrobbles, 5)
  const lastMonthTopArtists = topArtistsFromScrobbles(lastMonthScrobbles, 5)

  const thisWeekListeningMins = Math.round((thisWeekScrobbles.length * 3.5))
  const thisMonthListeningMins = Math.round((thisMonthScrobbles.length * 3.5))

  const thisWeekNewArtists = uniqueArtistCount(thisWeekScrobbles)
  const lastWeekNewArtists = uniqueArtistCount(lastWeekScrobbles)
  const thisMonthNewArtists = uniqueArtistCount(thisMonthScrobbles)
  const lastMonthNewArtists = uniqueArtistCount(lastMonthScrobbles)

  function fmtDate(d: Date) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function fmtMins(mins: number) {
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  function changeLabel(change: number | null) {
    if (change === null) return null
    if (change === 0) return <span className="text-muted-foreground text-sm">no change</span>
    const color = change > 0 ? 'text-green-500' : 'text-red-500'
    return <span className={`text-sm font-medium ${color}`}>{change > 0 ? '+' : ''}{change}%</span>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Listening Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Your weekly and monthly music stats</p>
        </div>
        <ShareReportButton
          username={username}
          weekScrobbles={thisWeekScrobbles.length}
          topArtist={thisWeekTopArtists[0]?.name ?? null}
        />
      </div>

      {/* Weekly Report */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Weekly Report
          <span className="text-xs font-normal text-muted-foreground">
            {fmtDate(thisWeek.start)} – {fmtDate(thisWeek.end)}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Scrobbles this week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{thisWeekScrobbles.length.toLocaleString('en-US')}</p>
              <div className="mt-1">{changeLabel(weekChange)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Listening time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{fmtMins(thisWeekListeningMins)}</p>
              <p className="text-xs text-muted-foreground mt-1">est. at 3.5 min/track</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Artists explored</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{thisWeekNewArtists.toLocaleString('en-US')}</p>
              {lastWeekNewArtists > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs {lastWeekNewArtists} last week
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Artists This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {thisWeekTopArtists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scrobbles this week</p>
              ) : (
                <ol className="space-y-2">
                  {thisWeekTopArtists.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                      <ArtistImage name={a.name} size="xs" />
                      <span className="flex-1 text-sm truncate font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{a.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Artists Last Week</CardTitle>
            </CardHeader>
            <CardContent>
              {lastWeekTopArtists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scrobbles last week</p>
              ) : (
                <ol className="space-y-2">
                  {lastWeekTopArtists.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                      <ArtistImage name={a.name} size="xs" />
                      <span className="flex-1 text-sm truncate font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{a.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Monthly Report */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Monthly Report
          <span className="text-xs font-normal text-muted-foreground">
            {thisMonth.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Scrobbles this month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{thisMonthScrobbles.length.toLocaleString('en-US')}</p>
              <div className="mt-1">{changeLabel(monthChange)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Listening time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{fmtMins(thisMonthListeningMins)}</p>
              <p className="text-xs text-muted-foreground mt-1">est. at 3.5 min/track</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Artists explored</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{thisMonthNewArtists.toLocaleString('en-US')}</p>
              {lastMonthNewArtists > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs {lastMonthNewArtists} last month
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Artists This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {thisMonthTopArtists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scrobbles this month</p>
              ) : (
                <ol className="space-y-2">
                  {thisMonthTopArtists.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                      <ArtistImage name={a.name} size="xs" />
                      <span className="flex-1 text-sm truncate font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{a.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Artists Last Month</CardTitle>
            </CardHeader>
            <CardContent>
              {lastMonthTopArtists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scrobbles last month</p>
              ) : (
                <ol className="space-y-2">
                  {lastMonthTopArtists.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                      <ArtistImage name={a.name} size="xs" />
                      <span className="flex-1 text-sm truncate font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{a.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
