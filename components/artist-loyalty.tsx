'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { artistHref } from '@/lib/urls'

interface ArtistLoyaltyProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
  username: string
}

const ARTIST_OPACITIES = [1, 0.8, 0.6, 0.45, 0.3]

export function ArtistLoyalty({ topArtists, totalScrobbles, username }: ArtistLoyaltyProps) {
  const segments = useMemo(() => {
    if (totalScrobbles === 0 || topArtists.length === 0) return []

    return topArtists.slice(0, 5).map((artist, i) => ({
      name: artist.name,
      playcount: artist.playcount,
      pct: Math.min(100, (artist.playcount / totalScrobbles) * 100),
      opacity: ARTIST_OPACITIES[i],
    }))
  }, [topArtists, totalScrobbles])

  if (topArtists.length === 0 || totalScrobbles === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artist Loyalty</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No artist data yet.</p>
        </CardContent>
      </Card>
    )
  }

  const totalPct = segments.reduce((sum, s) => sum + s.pct, 0)
  const restPct = Math.max(0, 100 - totalPct)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artist Loyalty</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Stacked horizontal bar */}
        <div className="flex h-8 w-full rounded-md overflow-hidden gap-px">
          {segments.filter((s) => s.pct > 0).map((s) => (
            <div
              key={s.name}
              title={`${s.name}: ${s.pct.toFixed(1)}%`}
              style={{
                width: `${s.pct}%`,
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(s.opacity * 100)}%, transparent)`,
                minWidth: '2px',
              }}
            />
          ))}
          {restPct > 0 && (
            <div
              title={`Other: ${restPct.toFixed(1)}%`}
              style={{
                width: `${restPct}%`,
                backgroundColor: 'var(--muted)',
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {segments.filter((s) => s.pct > 0).map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(s.opacity * 100)}%, transparent)` }}
              />
              <Link href={artistHref(s.name, username)} className="text-sm truncate flex-1 min-w-0 hover:underline hover:text-primary transition-colors">{s.name}</Link>
              <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                {s.playcount.toLocaleString('en-US')} · {s.pct.toFixed(1)}%
              </span>
            </div>
          ))}
          {restPct > 0.5 && (
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--muted)' }}
              />
              <span className="text-sm truncate flex-1 min-w-0 text-muted-foreground">Other</span>
              <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                {restPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
