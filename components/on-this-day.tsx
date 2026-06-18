'use client'

import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
}

interface OnThisDayProps {
  scrobbles: Scrobble[]
}

export function OnThisDay({ scrobbles }: OnThisDayProps) {
  const { targetDate, topArtists, topTracks, hasData } = useMemo(() => {
    const now = new Date()
    const target = new Date(now)
    target.setDate(now.getDate() - 365)

    const windowMs = 3 * 24 * 60 * 60 * 1000 // ±3 days in ms

    const inWindow = scrobbles.filter((s) => {
      const t = new Date(s.scrobbledAt).getTime()
      return Math.abs(t - target.getTime()) <= windowMs
    })

    const artistCounts: Record<string, number> = {}
    const trackCounts: Record<string, number> = {}

    for (const s of inWindow) {
      artistCounts[s.artist] = (artistCounts[s.artist] ?? 0) + 1
      const trackKey = `${s.artist} — ${s.track}`
      trackCounts[trackKey] = (trackCounts[trackKey] ?? 0) + 1
    }

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }))

    return {
      targetDate: target,
      topArtists,
      topTracks,
      hasData: inWindow.length > 0,
    }
  }, [scrobbles])

  const formattedDate = targetDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          On This Day
        </CardTitle>
        <p className="text-sm text-muted-foreground">1 year ago: {formattedDate}</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            No scrobbles found around this time last year
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {topArtists.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top Artists
                </p>
                <div className="flex flex-wrap gap-2">
                  {topArtists.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topTracks.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top Tracks
                </p>
                <ol className="flex flex-col gap-1.5">
                  {topTracks.map(({ label, count }, i) => (
                    <li key={label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="shrink-0 text-xs font-medium tabular-nums"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate text-sm">{label}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {count}
                      </Badge>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
