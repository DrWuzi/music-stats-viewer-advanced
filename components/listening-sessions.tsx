'use client'

import { useMemo } from 'react'
import { Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const SESSION_GAP_MS = 30 * 60 * 1000 // 30 minutes

interface ListeningSessionsProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

interface Session {
  start: Date
  end: Date
  trackCount: number
  durationMs: number
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function computeSessions(scrobbles: { scrobbledAt: Date | string }[]): Session[] {
  if (scrobbles.length === 0) return []

  const sorted = [...scrobbles]
    .map((s) => new Date(s.scrobbledAt))
    .sort((a, b) => a.getTime() - b.getTime())

  const sessions: Session[] = []
  let sessionStart = sorted[0]
  let sessionEnd = sorted[0]
  let count = 1

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].getTime() - sorted[i - 1].getTime()
    if (gap > SESSION_GAP_MS) {
      sessions.push({
        start: sessionStart,
        end: sessionEnd,
        trackCount: count,
        durationMs: sessionEnd.getTime() - sessionStart.getTime(),
      })
      sessionStart = sorted[i]
      sessionEnd = sorted[i]
      count = 1
    } else {
      sessionEnd = sorted[i]
      count++
    }
  }
  sessions.push({
    start: sessionStart,
    end: sessionEnd,
    trackCount: count,
    durationMs: sessionEnd.getTime() - sessionStart.getTime(),
  })

  return sessions
}

export function ListeningSessions({ scrobbles }: ListeningSessionsProps) {
  const sessions = useMemo(() => computeSessions(scrobbles), [scrobbles])

  const totalSessions = sessions.length
  const avgDurationMin =
    totalSessions > 0
      ? sessions.reduce((sum, s) => sum + s.durationMs, 0) / totalSessions / (1000 * 60)
      : 0

  const longestSession =
    sessions.length > 0
      ? sessions.reduce((best, s) => (s.durationMs > best.durationMs ? s : best))
      : null

  const lastFive = [...sessions].slice(-5).reverse()

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Radio} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold">{totalSessions.toLocaleString('en-US')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatDuration(avgDurationMin)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Length</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {longestSession ? formatDuration(longestSession.durationMs / (1000 * 60)) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {longestSession ? `${longestSession.trackCount} tracks` : 'Longest'}
            </p>
          </div>
        </div>

        {lastFive.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Last {lastFive.length} session{lastFive.length !== 1 ? 's' : ''}
            </p>
            {lastFive.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="text-muted-foreground text-xs">
                  {s.start.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-xs">
                  {formatDuration(s.durationMs / (1000 * 60))} &middot; {s.trackCount} tracks
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
