'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
  album: string | null
}

interface FirstListensProps {
  scrobbles: Scrobble[]
  username: string
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

export function FirstListens({ scrobbles, username }: FirstListensProps) {
  const topDiscoveries = useMemo(() => {
    if (!scrobbles || scrobbles.length === 0) return []

    const artistMap = new Map<string, { firstListenDate: Date; totalPlays: number }>()

    for (const scrobble of scrobbles) {
      const artist = scrobble.artist
      const date = scrobble.scrobbledAt instanceof Date
        ? scrobble.scrobbledAt
        : new Date(scrobble.scrobbledAt)

      const existing = artistMap.get(artist)
      if (!existing) {
        artistMap.set(artist, { firstListenDate: date, totalPlays: 1 })
      } else {
        existing.totalPlays += 1
        if (date < existing.firstListenDate) {
          existing.firstListenDate = date
        }
      }
    }

    const now = Date.now()
    const thirtyDaysMs = 30 * 86400000

    return Array.from(artistMap.entries())
      .map(([artist, { firstListenDate, totalPlays }]) => ({
        artist,
        firstListenDate,
        totalPlays,
        isNew: now - firstListenDate.getTime() <= thirtyDaysMs,
      }))
      .sort((a, b) => b.firstListenDate.getTime() - a.firstListenDate.getTime())
      .slice(0, 10)
  }, [scrobbles])

  if (topDiscoveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>First Listens</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Sparkles} title="No data available." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>First Listens</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {topDiscoveries.map(({ artist, firstListenDate, totalPlays, isNew }) => (
            <li key={artist} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={artistHref(artist, username)}
                  className="font-medium truncate hover:underline hover:text-primary transition-colors"
                  style={{ color: 'var(--foreground)' }}
                >
                  {artist}
                </Link>
                {isNew && (
                  <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0">
                    NEW
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <span style={{ color: 'var(--muted-foreground)' }}>
                  {formatRelativeDate(firstListenDate)}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {totalPlays} {totalPlays === 1 ? 'play' : 'plays'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
