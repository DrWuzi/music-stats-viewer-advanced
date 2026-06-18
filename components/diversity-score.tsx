'use client'

import { AnimatedNumber } from '@/components/animated-number'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DiversityScoreProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
}

type Category = 'Highly Focused' | 'Balanced' | 'Diverse' | 'Eclectic'

function getCategory(score: number): Category {
  if (score < 40) return 'Highly Focused'
  if (score < 70) return 'Balanced'
  if (score < 85) return 'Diverse'
  return 'Eclectic'
}

const CATEGORY_STYLES: Record<Category, string> = {
  'Highly Focused': 'bg-[color-mix(in_oklch,var(--destructive)_15%,transparent)] text-[color-mix(in_oklch,var(--destructive)_90%,var(--foreground))]',
  'Balanced':       'bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] text-[color-mix(in_oklch,var(--primary)_90%,var(--foreground))]',
  'Diverse':        'bg-[color-mix(in_oklch,var(--primary)_20%,transparent)] text-[color-mix(in_oklch,var(--primary)_100%,transparent)]',
  'Eclectic':       'bg-[color-mix(in_oklch,var(--primary)_25%,transparent)] text-[color-mix(in_oklch,var(--primary)_100%,transparent)]',
}

const AVERAGE_LISTENER_SCORE = 55

export function DiversityScore({ topArtists, totalScrobbles }: DiversityScoreProps) {
  if (!topArtists.length || totalScrobbles === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Diversity Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">Not enough data to calculate diversity.</p>
        </CardContent>
      </Card>
    )
  }

  // HHI calculation
  const hhi = topArtists.reduce((acc, artist) => {
    const share = artist.playcount / totalScrobbles
    return acc + share * share
  }, 0)

  const diversity = 1 - hhi
  const score = Math.round(diversity * 100)
  const category = getCategory(score)

  // Top 10 artists % of total
  const top10Plays = topArtists.slice(0, 10).reduce((acc, a) => acc + a.playcount, 0)
  const top10Pct = Math.round((top10Plays / totalScrobbles) * 100)

  // Top 5 for bar chart
  const top5 = topArtists.slice(0, 5).map((a) => ({
    name: a.name,
    pct: (a.playcount / totalScrobbles) * 100,
  }))

  const badgeClass = CATEGORY_STYLES[category]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Diversity Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score + Badge */}
        <div className="flex items-end gap-4">
          <span className="text-7xl font-bold tabular-nums leading-none text-[var(--foreground)]">
            <AnimatedNumber value={score} duration={900} />
          </span>
          <div className="mb-1 flex flex-col gap-1">
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${badgeClass}`}
            >
              {category}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">out of 100</span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-sm text-[var(--muted-foreground)]">
          Your top 10 artists account for{' '}
          <span className="font-semibold text-[var(--foreground)]">{top10Pct}%</span> of all plays.
        </p>

        {/* Comparison bar */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            vs. Average Listener
          </p>
          <div className="relative h-4 w-full rounded-full bg-[color-mix(in_oklch,var(--muted)_60%,transparent)]">
            {/* Your score bar */}
            <div
              className="absolute left-0 top-0 h-4 rounded-full bg-[var(--primary)] transition-all duration-700"
              style={{ width: `${score}%` }}
            />
            {/* Average marker */}
            <div
              className="absolute top-0 h-4 w-0.5 bg-[var(--foreground)] opacity-60"
              style={{ left: `${AVERAGE_LISTENER_SCORE}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
            <span>You: {score}</span>
            <span>Avg: {AVERAGE_LISTENER_SCORE}</span>
          </div>
        </div>

        {/* Top 5 mini bar chart */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            Top 5 Artists Share
          </p>
          <div className="space-y-1.5">
            {top5.map((artist) => (
              <div key={artist.name} className="flex items-center gap-2">
                <span
                  className="w-28 truncate text-right text-xs text-[var(--muted-foreground)]"
                  title={artist.name}
                >
                  {artist.name}
                </span>
                <div className="relative flex-1 h-2.5 rounded-full bg-[color-mix(in_oklch,var(--muted)_60%,transparent)]">
                  <div
                    className="absolute left-0 top-0 h-2.5 rounded-full bg-[color-mix(in_oklch,var(--primary)_70%,transparent)]"
                    style={{ width: `${Math.min(artist.pct, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-[var(--muted-foreground)]">
                  {artist.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
