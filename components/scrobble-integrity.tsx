'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, Clock, Trophy, Repeat, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref, trackHref } from '@/lib/urls'

interface ScrobbleIntegrityProps {
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[]
  username: string
}

interface Finding {
  icon: React.ReactNode
  message: React.ReactNode
  variant: 'warning' | 'success' | 'info'
}

function analyzeScrobbles(
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[],
  username: string,
): Finding[] {
  if (scrobbles.length === 0) return []

  // Build day-count map and track+artist per day map
  const dayCountMap: Record<string, number> = {}
  const dayTrackMap: Record<string, Record<string, number>> = {}

  for (const s of scrobbles) {
    const day = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    dayCountMap[day] = (dayCountMap[day] ?? 0) + 1

    if (!dayTrackMap[day]) dayTrackMap[day] = {}
    const key = `${s.artist}|||${s.track}`
    dayTrackMap[day][key] = (dayTrackMap[day][key] ?? 0) + 1
  }

  const findings: Finding[] = []

  // a) Burst days: days with > 500 scrobbles
  for (const [day, count] of Object.entries(dayCountMap)) {
    if (count > 500) {
      const formatted = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
      findings.push({
        icon: <TrendingUp className="h-4 w-4" />,
        message: `Burst day on ${formatted}: ${count.toLocaleString()} scrobbles (possible import or scrubber artifact)`,
        variant: 'warning',
      })
    }
  }

  // b) Longest gap (min 14 days)
  const sortedDays = Object.keys(dayCountMap).sort()
  if (sortedDays.length >= 2) {
    let longestGapDays = 0
    let gapStart = ''
    let gapEnd = ''

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1] + 'T12:00:00Z')
      const curr = new Date(sortedDays[i] + 'T12:00:00Z')
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) - 1
      if (diffDays > longestGapDays) {
        longestGapDays = diffDays
        gapStart = sortedDays[i - 1]
        gapEnd = sortedDays[i]
      }
    }

    if (longestGapDays >= 14) {
      const fmt = (d: string) =>
        new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      findings.push({
        icon: <Clock className="h-4 w-4" />,
        message: `Longest silence: ${longestGapDays} days with no scrobbles (${fmt(gapStart)} – ${fmt(gapEnd)})`,
        variant: 'warning',
      })
    }
  }

  // c) Record day: single day with most scrobbles (shown as achievement)
  let recordDay = ''
  let recordCount = 0
  for (const [day, count] of Object.entries(dayCountMap)) {
    if (count > recordCount) {
      recordCount = count
      recordDay = day
    }
  }
  if (recordDay) {
    const formatted = new Date(recordDay + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    findings.push({
      icon: <Trophy className="h-4 w-4" />,
      message: `Record day: ${formatted} with ${recordCount.toLocaleString()} scrobbles`,
      variant: 'success',
    })
  }

  // d) Repeat storm: same track+artist more than 15 times in one day
  for (const [day, trackCounts] of Object.entries(dayTrackMap)) {
    for (const [key, count] of Object.entries(trackCounts)) {
      if (count > 15) {
        const [artist, track] = key.split('|||')
        const formatted = new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
        findings.push({
          icon: <Repeat className="h-4 w-4" />,
          message: (
            <>
              &quot;
              <Link href={trackHref(artist, track, username)} className="hover:underline font-medium">
                {track}
              </Link>
              &quot; by{' '}
              <Link href={artistHref(artist, username)} className="hover:underline font-medium">
                {artist}
              </Link>
              {' '}played {count}× on {formatted}
            </>
          ),
          variant: 'info',
        })
      }
    }
  }

  return findings
}

const BADGE_CLASSES: Record<Finding['variant'], string> = {
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

const BADGE_LABELS: Record<Finding['variant'], string> = {
  warning: 'Warning',
  success: 'Achievement',
  info: 'Info',
}

export function ScrobbleIntegrity({ scrobbles, username }: ScrobbleIntegrityProps) {
  const findings = useMemo(() => analyzeScrobbles(scrobbles, username), [scrobbles, username])

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Health</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={CheckCircle} title="No data available." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Health</CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Your listening history looks clean</span>
          </div>
        ) : (
          <ul className="space-y-3">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-muted-foreground">{f.icon}</span>
                <span className="flex-1 text-sm leading-snug">{f.message}</span>
                <Badge className={`shrink-0 text-xs font-medium ${BADGE_CLASSES[f.variant]}`}>
                  {BADGE_LABELS[f.variant]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
