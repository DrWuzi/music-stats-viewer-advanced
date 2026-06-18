'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, BarChart2, Music2, CalendarDays, Activity, Star } from 'lucide-react'

interface TopStatsBannerProps {
  totalScrobbles: number
  scrobbles: { scrobbledAt: Date | string }[]
  topArtist?: string
  username?: string
}

function toDateStr(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
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
      {/* Total — top stat with accent line */}
      <div
        className="rounded-lg border border-border/50 border-t-2 bg-card p-3 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200 animate-fade-in-up"
        style={{ borderTopColor: 'var(--primary)', animationDelay: '100ms' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full p-2"
            style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
          >
            <BarChart2 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          </span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <span className="text-2xl font-bold">{totalScrobbles.toLocaleString('en-US')}</span>
      </div>

      {/* Today */}
      <div
        className="rounded-lg border border-border/50 bg-card p-3 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200 animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full p-2"
            style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
          >
            <Music2 className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          </span>
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <span className="text-2xl font-bold">{stats.todayCount.toLocaleString('en-US')}</span>
      </div>

      {/* This Week */}
      <div
        className="rounded-lg border border-border/50 bg-card p-3 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200 animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full p-2"
            style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
          >
            <CalendarDays className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          </span>
          <span className="text-xs text-muted-foreground">This Week</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold">{stats.thisWeekCount.toLocaleString('en-US')}</span>
          {stats.weekTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />}
          {stats.weekTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
        </div>
      </div>

      {/* Avg/Day (30d) */}
      <div
        className="rounded-lg border border-border/50 bg-card p-3 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200 animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full p-2"
            style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
          >
            <Activity className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          </span>
          <span className="text-xs text-muted-foreground">Avg/Day (30d)</span>
        </div>
        <span className="text-2xl font-bold">{stats.avg30.toLocaleString('en-US')}</span>
      </div>

      {/* Top Artist */}
      {topArtist && (
        <div
          className="rounded-lg border border-border/50 bg-card p-3 flex flex-col gap-2 col-span-2 sm:col-span-4 hover:scale-[1.02] transition-transform duration-200 animate-fade-in-up"
          style={{ animationDelay: '500ms' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="rounded-full p-2"
              style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
            >
              <Star className="h-4 w-4" style={{ color: 'var(--primary)' }} />
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
