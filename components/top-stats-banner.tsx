'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, BarChart2, Music2, CalendarDays, Activity, Star } from 'lucide-react'
import { AnimatedNumber } from '@/components/animated-number'

interface TopStatsBannerProps {
  totalScrobbles: number
  scrobbles: { scrobbledAt: Date | string }[]
  topArtist?: string
  username?: string
}

function toDateStr(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

const tileHoverOn = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'color-mix(in oklch, var(--primary) 5%, var(--card))'
}
const tileHoverOff = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = ''
}

export function TopStatsBanner({ totalScrobbles, scrobbles, topArtist, username }: TopStatsBannerProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const msNow = now.getTime()
    const ms1d = 86_400_000
    const ms7d = 7 * ms1d
    const ms14d = 14 * ms1d
    const ms30d = 30 * ms1d

    let todayCount = 0
    let thisWeekCount = 0
    let lastWeekCount = 0
    let last30Count = 0

    for (const s of scrobbles) {
      const t = new Date(s.scrobbledAt).getTime()
      const age = msNow - t

      if (toDateStr(s.scrobbledAt) === todayStr) todayCount++
      if (age <= ms7d) thisWeekCount++
      if (age > ms7d && age <= ms14d) lastWeekCount++
      if (age <= ms30d) last30Count++
    }

    const avg30 = Math.round((last30Count / 30) * 10) / 10

    const weekTrend: 'up' | 'down' | 'flat' =
      thisWeekCount > lastWeekCount ? 'up' : thisWeekCount < lastWeekCount ? 'down' : 'flat'

    return { todayCount, thisWeekCount, lastWeekCount, avg30, weekTrend }
  }, [scrobbles])

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {/* Total — most prominent tile: border-t-2 accent + larger number */}
      <div
        className="rounded-lg border border-border/40 border-t-2 bg-gradient-to-br from-card to-card/50 bg-background/60 backdrop-blur-sm shadow-sm p-3 flex flex-col gap-2 transition-colors duration-200 animate-fade-in-up"
        style={{ borderTopColor: 'var(--primary)', animationDelay: '100ms' }}
        onMouseEnter={tileHoverOn}
        onMouseLeave={tileHoverOff}
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <BarChart2 className="h-4 w-4" />
          </span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AnimatedNumber value={totalScrobbles} className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent" />
          {stats.thisWeekCount !== stats.lastWeekCount && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={
                stats.weekTrend === 'up'
                  ? {
                      background: 'color-mix(in oklch, var(--success, #22c55e) 15%, transparent)',
                      color: 'var(--success, #22c55e)',
                    }
                  : {
                      background: 'color-mix(in oklch, var(--muted-foreground) 15%, transparent)',
                      color: 'var(--muted-foreground)',
                    }
              }
            >
              {stats.weekTrend === 'up' ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 shrink-0" />
              )}
              {stats.weekTrend === 'up' ? '+' : ''}
              {stats.thisWeekCount - stats.lastWeekCount} this week
            </span>
          )}
        </div>
      </div>

      {/* Today */}
      <div
        className="rounded-lg border border-border/40 bg-gradient-to-br from-card to-card/50 bg-background/60 backdrop-blur-sm shadow-sm p-3 flex flex-col gap-2 transition-colors duration-200 animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
        onMouseEnter={tileHoverOn}
        onMouseLeave={tileHoverOff}
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Music2 className="h-4 w-4" />
          </span>
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <AnimatedNumber value={stats.todayCount} className="text-2xl font-semibold" />
      </div>

      {/* This Week */}
      <div
        className="rounded-lg border border-border/40 bg-gradient-to-br from-card to-card/50 bg-background/60 backdrop-blur-sm shadow-sm p-3 flex flex-col gap-2 transition-colors duration-200 animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
        onMouseEnter={tileHoverOn}
        onMouseLeave={tileHoverOff}
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="text-xs text-muted-foreground">This Week</span>
        </div>
        <div className="flex items-center gap-1">
          <AnimatedNumber value={stats.thisWeekCount} className="text-2xl font-semibold" />
          {stats.weekTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />}
          {stats.weekTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
        </div>
      </div>

      {/* Avg/Day (30d) */}
      <div
        className="rounded-lg border border-border/40 bg-gradient-to-br from-card to-card/50 bg-background/60 backdrop-blur-sm shadow-sm p-3 flex flex-col gap-2 transition-colors duration-200 animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
        onMouseEnter={tileHoverOn}
        onMouseLeave={tileHoverOff}
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Activity className="h-4 w-4" />
          </span>
          <span className="text-xs text-muted-foreground">Avg/Day (30d)</span>
        </div>
        <AnimatedNumber value={stats.avg30} className="text-2xl font-semibold" />
      </div>

      {/* Top Artist */}
      {topArtist && (
        <div
          className="rounded-lg border border-border/40 bg-gradient-to-br from-card to-card/50 bg-background/60 backdrop-blur-sm shadow-sm p-3 flex flex-col gap-2 col-span-2 sm:col-span-4 transition-colors duration-200 animate-fade-in-up"
          style={{ animationDelay: '500ms' }}
          onMouseEnter={tileHoverOn}
          onMouseLeave={tileHoverOff}
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Star className="h-4 w-4" />
            </span>
            <span className="text-xs text-muted-foreground">Top Artist</span>
          </div>
          {username ? (
            <Link
              href={`/artist/${encodeURIComponent(topArtist)}?username=${encodeURIComponent(username)}`}
              className="text-lg font-bold hover:underline truncate"
            >
              {topArtist}
            </Link>
          ) : (
            <span className="text-lg font-bold truncate">{topArtist}</span>
          )}
        </div>
      )}
    </div>
  )
}
