'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtistImage } from '@/components/artist-image'
import { Sparkles } from 'lucide-react'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
}

interface OneHitWondersProps {
  scrobbles: Scrobble[]
}

function formatRelativeDate(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 1) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

export function OneHitWonders({ scrobbles }: OneHitWondersProps) {
  const wonders = useMemo(() => {
    if (!scrobbles || scrobbles.length === 0) return []

    // Track per-artist: play count, most recent scrobble, and the track played at that most recent time
    const artistMap = new Map<
      string,
      { playCount: number; mostRecentDate: Date; mostRecentTrack: string }
    >()

    for (const s of scrobbles) {
      const date =
        s.scrobbledAt instanceof Date ? s.scrobbledAt : new Date(s.scrobbledAt)
      const existing = artistMap.get(s.artist)
      if (!existing) {
        artistMap.set(s.artist, {
          playCount: 1,
          mostRecentDate: date,
          mostRecentTrack: s.track,
        })
      } else {
        existing.playCount += 1
        if (date > existing.mostRecentDate) {
          existing.mostRecentDate = date
          existing.mostRecentTrack = s.track
        }
      }
    }

    return Array.from(artistMap.entries())
      .filter(([, { playCount }]) => playCount === 1 || playCount === 2)
      .map(([artist, { playCount, mostRecentDate, mostRecentTrack }]) => ({
        artist,
        playCount,
        mostRecentDate,
        mostRecentTrack,
      }))
      .sort((a, b) => b.mostRecentDate.getTime() - a.mostRecentDate.getTime())
      .slice(0, 10)
  }, [scrobbles])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          One Hit Wonders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wonders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--muted-foreground)' }}>
            <Sparkles className="h-8 w-8 opacity-40" />
            <p className="text-sm">No one-hit wonders found.</p>
            <p className="text-xs opacity-70">
              Artists you&apos;ve only heard once or twice will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {wonders.map(({ artist, playCount, mostRecentDate, mostRecentTrack }) => (
              <li key={artist} className="flex items-center gap-3 min-w-0">
                <ArtistImage name={artist} size="xs" />
                <div className="flex flex-col min-w-0 flex-1">
                  <Link
                    href={`/artist/${encodeURIComponent(artist)}`}
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist}
                  </Link>
                  <span
                    className="text-xs truncate"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {mostRecentTrack}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 whitespace-nowrap"
                  >
                    {playCount === 1 ? 'Heard once' : 'Heard twice'}
                  </Badge>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {formatRelativeDate(mostRecentDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
