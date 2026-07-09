import Link from 'next/link'
import { getSession } from '@/lib/session'
import { lastfmClient } from '@/lib/lastfm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart2, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Charts — Last.fm Advanced' }

export default async function ChartsPage() {
  const session = await getSession()

  const [globalArtists, globalTracks, personalChart] = await Promise.all([
    lastfmClient.chartGetTopArtists(25).catch(() => []),
    lastfmClient.chartGetTopTracks(25).catch(() => []),
    session?.lastfmUsername
      ? lastfmClient.getWeeklyArtistChart(session.lastfmUsername).catch(() => [])
      : Promise.resolve([]),
  ])

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Charts</h1>
        <p className="text-muted-foreground text-sm mt-1">What the world is listening to this week</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Top Artists */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global Top Artists</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {globalArtists.length === 0 ? (
              <EmptyState icon={BarChart2} title="Could not load chart data" />
            ) : (
              <ol className="space-y-2.5">
                {globalArtists.map((artist, i) => (
                  <li key={artist.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <Link
                      href={`/artist/${encodeURIComponent(artist.name)}`}
                      className="flex-1 text-sm font-medium hover:underline truncate"
                    >
                      {artist.name}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {Number(artist.listeners).toLocaleString('en-US')} listeners
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Global Top Tracks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global Top Tracks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {globalTracks.length === 0 ? (
              <EmptyState icon={BarChart2} title="Could not load chart data" />
            ) : (
              <ol className="space-y-2.5">
                {globalTracks.map((track, i) => (
                  <li key={`${track.name}-${track.artist}`} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {Number(track.listeners).toLocaleString('en-US')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Personal This Week */}
        {session?.lastfmUsername && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center gap-2">
              <CardTitle className="text-base">Your Top Artists This Week</CardTitle>
              <Badge variant="secondary">{session.lastfmUsername}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {personalChart.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No personal chart data available yet" />
              ) : (
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalChart.slice(0, 20).map((artist, i) => (
                    <li key={artist.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">
                        {i + 1}
                      </span>
                      <Link
                        href={`/artist/${encodeURIComponent(artist.name)}`}
                        className="flex-1 text-sm font-medium hover:underline truncate"
                      >
                        {artist.name}
                      </Link>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {artist.playcount.toLocaleString('en-US')}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
