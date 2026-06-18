'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistImage } from '@/components/artist-image'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface ComebackArtist {
  name: string
  gapDays: number
  gapMonths: number
  playsBeforeGap: number
  playsAfterGap: number
  gapStart: Date
  gapEnd: Date
}

interface ComebackArtistsProps {
  scrobbles: Scrobble[]
}

const GAP_THRESHOLD_DAYS = 90

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function ComebackArtists({ scrobbles }: ComebackArtistsProps) {
  const comebacks = useMemo<ComebackArtist[]>(() => {
    // Group scrobbles by artist
    const byArtist = new Map<string, Date[]>()
    for (const s of scrobbles) {
      const dates = byArtist.get(s.artist)
      if (dates) {
        dates.push(s.scrobbledAt instanceof Date ? s.scrobbledAt : new Date(s.scrobbledAt))
      } else {
        byArtist.set(s.artist, [s.scrobbledAt instanceof Date ? s.scrobbledAt : new Date(s.scrobbledAt)])
      }
    }

    const results: ComebackArtist[] = []

    for (const [name, dates] of byArtist) {
      if (dates.length < 2) continue

      // Sort ascending
      dates.sort((a, b) => a.getTime() - b.getTime())

      let longestGapDays = 0
      let longestGapStart: Date | null = null
      let longestGapEnd: Date | null = null
      let longestGapIdx = -1

      for (let i = 1; i < dates.length; i++) {
        const gap = daysBetween(dates[i - 1], dates[i])
        if (gap > longestGapDays) {
          longestGapDays = gap
          longestGapStart = dates[i - 1]
          longestGapEnd = dates[i]
          longestGapIdx = i
        }
      }

      if (
        longestGapDays <= GAP_THRESHOLD_DAYS ||
        longestGapStart === null ||
        longestGapEnd === null ||
        longestGapIdx === -1
      ) {
        continue
      }

      // Must have scrobbles after the gap
      if (longestGapIdx >= dates.length - 1 && dates.length - 1 - longestGapIdx < 0) continue
      const playsAfterGap = dates.length - longestGapIdx
      if (playsAfterGap < 1) continue

      const playsBeforeGap = longestGapIdx

      results.push({
        name,
        gapDays: longestGapDays,
        gapMonths: Math.round(longestGapDays / 30),
        playsBeforeGap,
        playsAfterGap,
        gapStart: longestGapStart,
        gapEnd: longestGapEnd,
      })
    }

    // Sort by longest gap first, take top 5
    results.sort((a, b) => b.gapDays - a.gapDays)
    return results.slice(0, 5)
  }, [scrobbles])

  if (comebacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comeback Artists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No comeback artists found yet. Keep listening!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comeback Artists</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {comebacks.map((artist) => (
          <div key={artist.name} className="flex items-center gap-3">
            <ArtistImage name={artist.name} size="md" />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <Link
                href={`/artist/${encodeURIComponent(artist.name)}`}
                className="text-sm font-semibold truncate hover:underline"
                style={{ color: 'var(--foreground)' }}
              >
                {artist.name}
              </Link>
              <p className="text-xs" style={{ color: 'var(--primary)' }}>
                Returned after {artist.gapMonths} month{artist.gapMonths !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>{artist.playsBeforeGap} plays before</span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span>{artist.playsAfterGap} plays after</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
