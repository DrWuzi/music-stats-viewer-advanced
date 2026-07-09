'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Disc3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { albumHref, artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  album: string | null
}

interface AlbumOfMonthProps {
  scrobbles: Scrobble[]
  username: string
}

interface MonthEntry {
  monthKey: string
  monthLabel: string
  album: string
  artist: string
  count: number
}

function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

export function AlbumOfMonth({ scrobbles, username }: AlbumOfMonthProps) {
  const monthEntries = useMemo((): MonthEntry[] => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Build last 6 months list (inclusive of current)
    const months: { year: number; month: number; key: string }[] = []
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i
      let y = currentYear
      while (m <= 0) {
        m += 12
        y -= 1
      }
      months.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` })
    }

    // Filter out null albums and group counts by month+album+artist
    const monthAlbumCounts: Record<string, Record<string, number>> = {}

    for (const s of scrobbles) {
      if (!s.album) continue
      const d = new Date(s.scrobbledAt)
      const y = d.getFullYear()
      const mo = d.getMonth() + 1
      const mk = `${y}-${String(mo).padStart(2, '0')}`

      if (!monthAlbumCounts[mk]) monthAlbumCounts[mk] = {}
      const comboKey = `${s.artist}|||${s.album}`
      monthAlbumCounts[mk][comboKey] = (monthAlbumCounts[mk][comboKey] ?? 0) + 1
    }

    const results: MonthEntry[] = []

    for (const { year, month, key } of months) {
      const counts = monthAlbumCounts[key]
      if (!counts) continue

      let topCombo = ''
      let topCount = 0
      for (const [combo, count] of Object.entries(counts)) {
        if (count > topCount) {
          topCount = count
          topCombo = combo
        }
      }

      if (!topCombo) continue

      const [artist, album] = topCombo.split('|||')
      results.push({
        monthKey: key,
        monthLabel: getMonthLabel(year, month),
        album,
        artist,
        count: topCount,
      })
    }

    return results
  }, [scrobbles])

  if (monthEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Album of the Month</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Disc3} title="Not enough data to show monthly albums." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Album of the Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l" style={{ borderColor: 'var(--border)' }}>
          {monthEntries.map((entry, idx) => (
            <li key={entry.monthKey} className={`ml-4 ${idx < monthEntries.length - 1 ? 'mb-6' : ''}`}>
              {/* Timeline dot */}
              <span
                className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2"
                style={{
                  backgroundColor: 'var(--primary)',
                  borderColor: 'var(--background)',
                }}
              />

              {/* Month label */}
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {entry.monthLabel}
              </p>

              <div className="flex items-center gap-3">
                {/* Album art / fallback */}
                <AlbumArt album={entry.album} artist={entry.artist} />

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={albumHref(entry.artist, entry.album, username)}
                        className="block truncate font-medium leading-tight hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {entry.album}
                      </Link>
                      <Link
                        href={artistHref(entry.artist, username)}
                        className="mt-0.5 block truncate text-sm hover:underline"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {entry.artist}
                      </Link>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {entry.count} {entry.count === 1 ? 'play' : 'plays'}
                    </Badge>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

interface AlbumArtProps {
  album: string
  artist: string
}

function AlbumArt({ album, artist }: AlbumArtProps) {
  const initial = album.charAt(0).toUpperCase() || '?'

  // Deterministic gradient based on artist+album string
  const seed = (artist + album)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue1 = seed % 360
  const hue2 = (hue1 + 60) % 360

  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
      style={{ background: `linear-gradient(135deg, oklch(0.55 0.18 ${hue1}), oklch(0.45 0.18 ${hue2}))` }}
      aria-hidden="true"
    >
      <span
        className="flex h-full w-full items-center justify-center text-lg font-bold"
        style={{ color: 'white' }}
      >
        {initial}
      </span>
    </div>
  )
}
