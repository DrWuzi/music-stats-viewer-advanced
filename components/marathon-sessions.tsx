'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Clock, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
}

interface Session {
  start: Date
  end: Date
  durationMs: number
  trackCount: number
  topArtist: string
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function formatTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getMedalStyle(rank: number): { color: string; label: string } {
  if (rank === 1) return { color: '#FFD700', label: '1st' }
  if (rank === 2) return { color: '#C0C0C0', label: '2nd' }
  if (rank === 3) return { color: '#CD7F32', label: '3rd' }
  return { color: 'var(--muted-foreground)', label: `${rank}th` }
}

function buildSessions(scrobbles: Scrobble[]): Session[] {
  if (!scrobbles.length) return []

  const sorted = [...scrobbles].sort(
    (a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime()
  )

  const sessions: Session[] = []
  let sessionStart = new Date(sorted[0].scrobbledAt)
  let sessionEnd = new Date(sorted[0].scrobbledAt)
  let artistCounts: Record<string, number> = {}
  artistCounts[sorted[0].artist] = 1
  let count = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].scrobbledAt)
    const curr = new Date(sorted[i].scrobbledAt)
    const gapMs = curr.getTime() - prev.getTime()

    if (gapMs <= 30 * 60 * 1000) {
      sessionEnd = curr
      count++
      artistCounts[sorted[i].artist] = (artistCounts[sorted[i].artist] ?? 0) + 1
    } else {
      const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0][0]
      sessions.push({
        start: sessionStart,
        end: sessionEnd,
        durationMs: sessionEnd.getTime() - sessionStart.getTime(),
        trackCount: count,
        topArtist,
      })
      sessionStart = curr
      sessionEnd = curr
      artistCounts = { [sorted[i].artist]: 1 }
      count = 1
    }
  }

  // flush last session
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0][0]
  sessions.push({
    start: sessionStart,
    end: sessionEnd,
    durationMs: sessionEnd.getTime() - sessionStart.getTime(),
    trackCount: count,
    topArtist,
  })

  return sessions.sort((a, b) => b.durationMs - a.durationMs).slice(0, 5)
}

export function MarathonSessions({ scrobbles, username }: { scrobbles: Scrobble[]; username: string }) {
  const sessions = useMemo(() => buildSessions(scrobbles), [scrobbles])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Trophy className="h-5 w-5" style={{ color: 'var(--primary)' }} />
        <CardTitle className="text-base font-semibold">Longest Listening Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions found.</p>
        ) : (
          <ol className="space-y-3">
            {sessions.map((session, index) => {
              const rank = index + 1
              const medal = getMedalStyle(rank)
              return (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: rank <= 3 ? medal.color : 'var(--muted)',
                      color: rank <= 3 ? '#000' : 'var(--muted-foreground)',
                    }}
                  >
                    {medal.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-bold"
                        style={{ color: 'var(--primary)' }}
                      >
                        {formatDuration(session.durationMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.trackCount} track{session.trackCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {formatTime(session.start)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      Top artist: <Link href={artistHref(session.topArtist, username)} className="font-medium text-foreground hover:underline hover:text-primary transition-colors">{session.topArtist}</Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
