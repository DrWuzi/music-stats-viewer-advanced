'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'

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
      <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-2xl font-bold">{totalScrobbles.toLocaleString('en-US')}</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Today</span>
        <span className="text-2xl font-bold">{stats.todayCount.toLocaleString('en-US')}</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">This Week</span>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold">{stats.thisWeekCount.toLocaleString('en-US')}</span>
          {stats.weekTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />}
          {stats.weekTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Avg/Day (30d)</span>
        <span className="text-2xl font-bold">{stats.avg30.toLocaleString('en-US')}</span>
      </div>
      {topArtist && (
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1 col-span-2 sm:col-span-4">
          <span className="text-xs text-muted-foreground">Top Artist</span>
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
