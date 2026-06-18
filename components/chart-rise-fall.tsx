'use client'

import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'
import { Badge } from '@/components/ui/badge'

interface ArtistPeriod {
  name: string
  playcount: number
  rank: number
}

interface ChartRiseFallProps {
  topArtists: Record<string, ArtistPeriod[]>
}

interface Riser {
  name: string
  oldRank: number
  newRank: number
  change: number
}

interface Faller {
  name: string
  oldRank: number
  newRank: number
  change: number
}

interface NewArtist {
  name: string
  rank: number
}

export function ChartRiseFall({ topArtists }: ChartRiseFallProps) {
  const monthly = topArtists['1month'] ?? []
  const quarterly = topArtists['3month'] ?? []

  const quarterlyMap = new Map<string, ArtistPeriod>()
  for (const a of quarterly) {
    quarterlyMap.set(a.name, a)
  }

  const risers: Riser[] = []
  const fallers: Faller[] = []
  const newArtists: NewArtist[] = []

  for (const artist of monthly) {
    const prev = quarterlyMap.get(artist.name)
    if (!prev) {
      newArtists.push({ name: artist.name, rank: artist.rank })
      continue
    }
    const change = prev.rank - artist.rank // positive = improved (rank number went down)
    if (change >= 5) {
      risers.push({ name: artist.name, oldRank: prev.rank, newRank: artist.rank, change })
    } else if (change <= -5) {
      fallers.push({ name: artist.name, oldRank: prev.rank, newRank: artist.rank, change })
    }
  }

  risers.sort((a, b) => b.change - a.change)
  fallers.sort((a, b) => a.change - b.change)
  newArtists.sort((a, b) => a.rank - b.rank)

  const hasContent = risers.length > 0 || fallers.length > 0 || newArtists.length > 0

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold mb-1">Chart Rise &amp; Fall</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Not enough data to compare periods.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Chart Rise &amp; Fall</h2>
        <p className="text-sm text-[var(--muted-foreground)]">1 month vs 3 month ranking</p>
      </div>

      {risers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" style={{ color: 'oklch(0.65 0.15 145)' }} />
            <span className="text-sm font-semibold" style={{ color: 'oklch(0.65 0.15 145)' }}>
              Rising
            </span>
          </div>
          <ul className="space-y-2">
            {risers.map((artist) => (
              <li
                key={artist.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[var(--muted)]"
              >
                <ArtistImage name={artist.name} size="sm" />
                <span className="flex-1 text-sm font-medium truncate">{artist.name}</span>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: 'oklch(0.65 0.15 145)' }}
                >
                  +{artist.change}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fallers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-[var(--destructive)]" />
            <span className="text-sm font-semibold text-[var(--destructive)]">Falling</span>
          </div>
          <ul className="space-y-2">
            {fallers.map((artist) => (
              <li
                key={artist.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[var(--muted)]"
              >
                <ArtistImage name={artist.name} size="sm" />
                <span className="flex-1 text-sm font-medium truncate">{artist.name}</span>
                <span className="text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
                  {artist.change}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {newArtists.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[var(--foreground)]" />
            <span className="text-sm font-semibold">New Obsessions</span>
          </div>
          <ul className="space-y-2">
            {newArtists.map((artist) => (
              <li
                key={artist.name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[var(--muted)]"
              >
                <ArtistImage name={artist.name} size="sm" />
                <span className="flex-1 text-sm font-medium truncate">{artist.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  NEW
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
