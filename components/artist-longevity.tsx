'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistImage } from '@/components/artist-image'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref } from '@/lib/urls'

interface ArtistLongevityProps {
  scrobbles: { scrobbledAt: Date; artist: string }[]
  username: string
}

interface ArtistStat {
  name: string
  longevityYears: number
  totalPlays: number
  firstDate: Date
}

export function ArtistLongevity({ scrobbles, username }: ArtistLongevityProps) {
  const artists = useMemo<ArtistStat[]>(() => {
    if (!scrobbles || scrobbles.length === 0) return []

    const map = new Map<string, { first: Date; last: Date; count: number }>()

    for (const s of scrobbles) {
      const date = s.scrobbledAt instanceof Date ? s.scrobbledAt : new Date(s.scrobbledAt)
      const existing = map.get(s.artist)
      if (!existing) {
        map.set(s.artist, { first: date, last: date, count: 1 })
      } else {
        if (date < existing.first) existing.first = date
        if (date > existing.last) existing.last = date
        existing.count++
      }
    }

    const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25

    const result: ArtistStat[] = []
    for (const [name, { first, last, count }] of map) {
      const longevityYears = (last.getTime() - first.getTime()) / MS_PER_YEAR
      if (longevityYears >= 2 && count >= 10) {
        result.push({ name, longevityYears, totalPlays: count, firstDate: first })
      }
    }

    result.sort((a, b) => b.longevityYears - a.longevityYears)
    return result.slice(0, 8)
  }, [scrobbles])

  const maxYears = artists.length > 0 ? artists[0].longevityYears : 1

  if (artists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artist Longevity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={CalendarClock} title="No artists with 2+ years of consistent listening yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artist Longevity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {artists.map((artist) => {
          const barPct = Math.min(100, (artist.longevityYears / maxYears) * 100)
          const yearsLabel =
            artist.longevityYears >= 2
              ? `${artist.longevityYears.toFixed(1)} years`
              : `${artist.longevityYears.toFixed(1)} yr`
          const firstListened = artist.firstDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })

          return (
            <div key={artist.name} className="flex items-center gap-3">
              <ArtistImage name={artist.name} size="sm" />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={artistHref(artist.name, username)}
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist.name}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                      {artist.totalPlays.toLocaleString('en-US')} plays
                    </span>
                    <span className="text-xs tabular-nums font-semibold" style={{ color: 'var(--primary)' }}>
                      {yearsLabel}
                    </span>
                  </div>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: 'var(--primary)',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  First listened {firstListened}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
