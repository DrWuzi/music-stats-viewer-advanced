'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
}

interface MonthEntry {
  monthKey: string
  label: string
  track: string
  artist: string
  count: number
}

function getMonthKey(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function buildMonthlyTopTracks(scrobbles: Scrobble[]): MonthEntry[] {
  const now = new Date()
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(getMonthKey(d))
  }

  // count plays per month per track
  const counts: Record<string, Record<string, number>> = {}
  for (const monthKey of months) {
    counts[monthKey] = {}
  }

  for (const s of scrobbles) {
    const key = getMonthKey(new Date(s.scrobbledAt))
    if (!(key in counts)) continue
    const trackKey = `${s.artist}\0${s.track}`
    counts[key][trackKey] = (counts[key][trackKey] ?? 0) + 1
  }

  const entries: MonthEntry[] = []
  for (const monthKey of months) {
    const trackCounts = counts[monthKey]
    const entries_ = Object.entries(trackCounts)
    if (entries_.length === 0) continue
    const [topKey, topCount] = entries_.reduce((best, cur) =>
      cur[1] > best[1] ? cur : best
    )
    const [artist, track] = topKey.split('\0')
    entries.push({
      monthKey,
      label: formatMonthLabel(monthKey),
      track,
      artist,
      count: topCount,
    })
  }

  return entries
}

export function MonthlyTopTrack({ scrobbles }: { scrobbles: Scrobble[] }) {
  const entries = useMemo(() => buildMonthlyTopTracks(scrobbles), [scrobbles])

  const maxCount = useMemo(
    () => entries.reduce((m, e) => Math.max(m, e.count), 0),
    [entries]
  )

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Track of Every Month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Track of Every Month</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          {entries.map((entry, idx) => {
            const barPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0
            const isLast = idx === entries.length - 1

            return (
              <div
                key={entry.monthKey}
                className={`flex items-start gap-3 px-6 py-3 ${isLast ? '' : 'border-b border-border'}`}
              >
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  {!isLast && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ minHeight: '24px', backgroundColor: 'var(--border)' }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                      {entry.label}
                    </span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {entry.count} plays
                    </Badge>
                  </div>

                  <p className="text-sm font-medium leading-tight truncate" title={entry.track}>
                    {entry.track}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={entry.artist}>
                    {entry.artist}
                  </p>

                  {/* Play count bar */}
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: 'var(--primary)',
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
