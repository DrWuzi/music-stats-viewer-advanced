'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref, trackHref } from '@/lib/urls'

interface LovedTrack {
  artist: string
  track: string
  lovedAt: Date | string
}

interface MonthGroup {
  key: string
  label: string
  tracks: LovedTrack[]
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function toYearMonth(date: Date | string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function LovedTracksTimeline({
  lovedTracks,
  username,
}: {
  lovedTracks: LovedTrack[]
  username: string
}) {
  const groupMap: Record<string, LovedTrack[]> = {}

  for (const track of lovedTracks) {
    const key = toYearMonth(track.lovedAt)
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(track)
  }

  const allMonths: MonthGroup[] = Object.entries(groupMap)
    .map(([key, tracks]) => ({ key, label: formatMonthLabel(key), tracks }))
    .sort((a, b) => b.key.localeCompare(a.key))

  const months = allMonths.slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loved Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {months.length === 0 ? (
          <EmptyState icon={Heart} title="No loved tracks yet." size="compact" />
        ) : (
          <div className="flex flex-col gap-5">
            {months.map((month) => {
              const visible = month.tracks.slice(0, 5)
              const overflow = month.tracks.length - visible.length

              return (
                <div key={month.key}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {month.label}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {visible.map((t, i) => (
                      <li
                        key={`${month.key}-${i}`}
                        className="text-sm text-muted-foreground"
                      >
                        <Link href={trackHref(t.artist, t.track, username)} className="font-medium text-foreground hover:underline">
                          {t.track}
                        </Link>
                        {' — '}
                        <Link href={artistHref(t.artist, username)} className="hover:underline hover:text-foreground transition-colors">
                          {t.artist}
                        </Link>
                      </li>
                    ))}
                    {overflow > 0 && (
                      <li className="text-xs text-muted-foreground italic">
                        and {overflow} more…
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
