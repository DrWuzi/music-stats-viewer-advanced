'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref, trackHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date | string
  artist: string
  track: string
}

interface ActivityFeedProps {
  scrobbles: Scrobble[]
  totalScrobbles: number
  registeredAt: Date
  username: string
}

type EventType = 'milestone' | 'first-artist' | 'streak' | 'recent'

interface FeedEvent {
  date: Date
  type: EventType
  label: React.ReactNode
}

const MILESTONE_VALUES = [100, 500, 1000, 5000, 10000, 50000, 100000]

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

function buildEvents(
  scrobbles: Scrobble[],
  totalScrobbles: number,
  username: string,
): FeedEvent[] {
  if (scrobbles.length === 0) return []

  // Sort scrobbles oldest first
  const sorted = [...scrobbles].sort(
    (a, b) => toDate(a.scrobbledAt).getTime() - toDate(b.scrobbledAt).getTime(),
  )

  const events: FeedEvent[] = []

  // --- Milestones ---
  // We know total scrobbles but only have a local slice; infer from sorted index.
  // The sorted array index (1-based) represents the scrobble number within this dataset.
  // If totalScrobbles > scrobbles.length, offset = totalScrobbles - scrobbles.length
  const offset = totalScrobbles - sorted.length
  for (const milestone of MILESTONE_VALUES) {
    const localIndex = milestone - offset - 1 // 0-based
    if (localIndex >= 0 && localIndex < sorted.length) {
      events.push({
        date: toDate(sorted[localIndex].scrobbledAt),
        type: 'milestone',
        label: `🎉 Hit ${milestone.toLocaleString('en-US')} scrobbles`,
      })
    }
  }

  // --- First listen per top-10 artists ---
  const artistFirstSeen = new Map<string, { date: Date; track: string }>()
  for (const s of sorted) {
    if (!artistFirstSeen.has(s.artist)) {
      artistFirstSeen.set(s.artist, { date: toDate(s.scrobbledAt), track: s.track })
    }
  }
  // Count artist frequencies to find top 10
  const artistCounts = new Map<string, number>()
  for (const s of scrobbles) {
    artistCounts.set(s.artist, (artistCounts.get(s.artist) ?? 0) + 1)
  }
  const top10Artists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist]) => artist)

  for (const artist of top10Artists) {
    const first = artistFirstSeen.get(artist)
    if (first) {
      events.push({
        date: first.date,
        type: 'first-artist',
        label: (
          <>
            🎵 First listened to{' '}
            <Link href={artistHref(artist, username)} className="hover:underline font-medium">
              {artist}
            </Link>
          </>
        ),
      })
    }
  }

  // --- Longest streak start/end ---
  // Build day set
  const daySet = new Set<string>()
  for (const s of sorted) {
    daySet.add(toDate(s.scrobbledAt).toISOString().slice(0, 10))
  }
  const days = [...daySet].sort()
  let bestStart = days[0]
  let bestEnd = days[0]
  let bestLen = 1
  let curStart = days[0]
  let curLen = 1

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const cur = new Date(days[i])
    const diff = (cur.getTime() - prev.getTime()) / 86400000
    if (diff === 1) {
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
        bestEnd = days[i]
      }
    } else {
      curStart = days[i]
      curLen = 1
    }
  }

  if (bestLen > 1) {
    events.push({
      date: new Date(bestStart),
      type: 'streak',
      label: `🔥 Started ${bestLen}-day streak`,
    })
    if (bestStart !== bestEnd) {
      events.push({
        date: new Date(bestEnd),
        type: 'streak',
        label: `🔥 Ended ${bestLen}-day streak`,
      })
    }
  }

  // --- Most recent scrobble ---
  const latest = sorted[sorted.length - 1]
  if (latest) {
    events.push({
      date: toDate(latest.scrobbledAt),
      type: 'recent',
      label: (
        <>
          🎧 Last played:{' '}
          <Link href={trackHref(latest.artist, latest.track, username)} className="hover:underline font-medium">
            {latest.track}
          </Link>
          {' — '}
          <Link href={artistHref(latest.artist, username)} className="hover:underline">
            {latest.artist}
          </Link>
        </>
      ),
    })
  }

  // Sort all events newest first, take last 10
  events.sort((a, b) => b.date.getTime() - a.date.getTime())
  return events.slice(0, 10)
}

const dotColor: Record<EventType, string> = {
  milestone: 'var(--primary)',
  'first-artist': 'var(--chart-2, var(--primary))',
  streak: 'var(--destructive)',
  recent: 'var(--muted-foreground)',
}

export function ActivityFeed({ scrobbles, totalScrobbles, registeredAt, username }: ActivityFeedProps) {
  const events = useMemo(
    () => buildEvents(scrobbles, totalScrobbles, username),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrobbles, totalScrobbles, username],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState icon={Activity} title="No events to display yet." size="compact" />
        ) : (
          <ol className="relative flex flex-col gap-0">
            {events.map((event, i) => (
              <li key={i} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                {/* Vertical line */}
                {i < events.length - 1 && (
                  <span
                    className="absolute left-[calc(72px+8px)] top-5 bottom-0 w-px"
                    style={{
                      background: 'color-mix(in oklch, var(--border) 80%, transparent)',
                    }}
                  />
                )}

                {/* Date pill */}
                <span
                  className="shrink-0 w-[72px] text-right text-xs leading-none pt-[3px]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {formatDate(event.date)}
                </span>

                {/* Dot */}
                <span
                  className="relative z-10 mt-[2px] shrink-0 w-3.5 h-3.5 rounded-full border-2"
                  style={{
                    background: dotColor[event.type],
                    borderColor: 'var(--background)',
                    boxShadow: `0 0 0 2px ${dotColor[event.type]}`,
                  }}
                />

                {/* Label */}
                <span
                  className="text-sm leading-snug"
                  style={{ color: 'var(--foreground)' }}
                >
                  {event.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
