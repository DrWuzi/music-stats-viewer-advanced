'use client'

import { useMemo } from 'react'
import { Music } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ListeningTimeEstimateProps {
  totalScrobbles: number
}

const AVG_TRACK_MINUTES = 3.5
const AVG_MOVIE_HOURS = 2
const FLIGHT_AROUND_WORLD_HOURS = 40 // approx total flight time to circumnavigate the globe
const YEAR_HOURS = 365 * 24
const LAST_YEAR_HOURS = YEAR_HOURS

export function ListeningTimeEstimate({ totalScrobbles }: ListeningTimeEstimateProps) {
  const stats = useMemo(() => {
    const totalMinutes = totalScrobbles * AVG_TRACK_MINUTES
    const hours = Math.round(totalMinutes / 60)
    const days = Math.round(hours / 24)
    const percentOfLastYear = Math.min(((hours / LAST_YEAR_HOURS) * 100), 100)
    const movies = Math.round(hours / AVG_MOVIE_HOURS)
    const worldFlights = Math.round((hours / FLIGHT_AROUND_WORLD_HOURS) * 10) / 10

    // "% of your life" assuming avg life expectancy of 72 years
    const lifeHours = 72 * YEAR_HOURS
    const percentOfLife = (hours / lifeHours) * 100

    return { hours, days, percentOfLastYear, percentOfLife, movies, worldFlights }
  }, [totalScrobbles])

  if (totalScrobbles === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Listening Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
        </CardContent>
      </Card>
    )
  }

  const { hours, days, percentOfLastYear, percentOfLife, movies, worldFlights } = stats

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Listening Time
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Existing display */}
        <div className="flex flex-col gap-1">
          <span className="text-4xl font-bold tracking-tight">
            ~{hours.toLocaleString('en-US')} hours
          </span>
          <span className="text-sm text-muted-foreground">
            ~{days.toLocaleString('en-US')} days of music
          </span>
        </div>

        {/* Progress bar: % of last year spent listening */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>% of last year spent listening</span>
            <span className="font-medium tabular-nums">
              {percentOfLastYear.toFixed(2)}%
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(percentOfLastYear, 100)}%`,
                background: 'color-mix(in srgb, var(--primary) 80%, transparent)',
              }}
            />
          </div>
        </div>

        {/* Progress bar: % of life spent listening */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>% of your life spent listening</span>
            <span className="font-medium tabular-nums">
              {percentOfLife.toFixed(3)}%
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(percentOfLife * 10, 100)}%`,
                background: 'color-mix(in srgb, var(--primary) 60%, transparent)',
              }}
            />
          </div>
        </div>

        {/* Fun comparisons */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fun comparisons</p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">{movies.toLocaleString('en-US')}</span>{' '}
              movies watched (avg 2h each)
            </li>
            <li>
              <span className="font-semibold text-foreground">{worldFlights.toLocaleString('en-US')}x</span>{' '}
              around the world by plane
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
