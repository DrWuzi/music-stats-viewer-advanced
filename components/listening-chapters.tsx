'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { artistHref } from '@/lib/urls'

interface ListeningChaptersProps {
  scrobbles: { scrobbledAt: Date | string; artist: string }[]
  totalScrobbles: number
  registeredAt: Date | string
  username: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Chapter {
  year: number
  topArtist: string
  topArtistCount: number
  peakMonth: string
  peakMonthCount: number
  yearTotal: number
  changeVsPrev: number | null // percentage change vs previous year, null if no previous
}

function buildChapters(
  scrobbles: { scrobbledAt: Date | string; artist: string }[],
): Chapter[] {
  if (scrobbles.length === 0) return []

  // Aggregate per year: artist counts and month counts
  const yearData: Record<
    number,
    { artists: Record<string, number>; months: Record<string, number>; total: number }
  > = {}

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    const year = d.getUTCFullYear()
    const monthKey = `${year}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

    if (!yearData[year]) {
      yearData[year] = { artists: {}, months: {}, total: 0 }
    }
    yearData[year].artists[s.artist] = (yearData[year].artists[s.artist] ?? 0) + 1
    yearData[year].months[monthKey] = (yearData[year].months[monthKey] ?? 0) + 1
    yearData[year].total += 1
  }

  const years = Object.keys(yearData).map(Number).sort((a, b) => b - a) // most recent first
  const MAX_YEARS = 5

  return years.slice(0, MAX_YEARS).map((year, idx) => {
    const data = yearData[year]

    // Top artist
    const [topArtist, topArtistCount] = Object.entries(data.artists).sort(
      (a, b) => b[1] - a[1],
    )[0]

    // Peak month
    const [peakMonthKey, peakMonthCount] = Object.entries(data.months).sort(
      (a, b) => b[1] - a[1],
    )[0]
    const peakMonthIndex = parseInt(peakMonthKey.split('-')[1], 10) - 1
    const peakMonth = MONTH_NAMES[peakMonthIndex]

    // Change vs chronologically previous year (year - 1), not next in the sorted array
    const prevYear = year - 1
    const prevTotal = yearData[prevYear]?.total ?? null
    const changeVsPrev =
      prevTotal !== null && prevTotal > 0
        ? Math.round(((data.total - prevTotal) / prevTotal) * 100)
        : null

    return {
      year,
      topArtist,
      topArtistCount,
      peakMonth,
      peakMonthCount,
      yearTotal: data.total,
      changeVsPrev,
    }
  })
}

function ChapterCard({ chapter, isLast, username }: { chapter: Chapter; isLast: boolean; username: string }) {
  const { year, topArtist, topArtistCount, peakMonth, peakMonthCount, yearTotal, changeVsPrev } =
    chapter

  const changeText =
    changeVsPrev !== null
      ? changeVsPrev >= 0
        ? `That's ${changeVsPrev}% more than ${year - 1}.`
        : `That's ${Math.abs(changeVsPrev)}% less than ${year - 1}.`
      : null

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="h-3 w-3 rounded-full mt-4 shrink-0"
          style={{ backgroundColor: 'var(--primary)' }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{ backgroundColor: 'var(--border)', minHeight: '1.5rem' }}
          />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-3">
            <Badge
              variant="secondary"
              className="text-sm font-semibold tabular-nums shrink-0"
            >
              {year}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {yearTotal.toLocaleString('en-US')} scrobbles
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              In {year},{' '}
              <Link href={artistHref(topArtist, username)} className="font-semibold hover:underline hover:text-primary transition-colors" style={{ color: 'var(--primary)' }}>
                {topArtist}
              </Link>{' '}
              dominated your year with{' '}
              <span className="font-medium">{topArtistCount.toLocaleString('en-US')}</span>{' '}
              plays. Your peak month was{' '}
              <span className="font-medium">{peakMonth}</span> with{' '}
              <span className="font-medium">{peakMonthCount.toLocaleString('en-US')}</span>{' '}
              scrobbles.
              {changeText && (
                <>
                  {' '}
                  <span className="text-muted-foreground">{changeText}</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ListeningChapters({
  scrobbles,
  totalScrobbles,
  registeredAt,
  username,
}: ListeningChaptersProps) {
  const chapters = useMemo(() => buildChapters(scrobbles), [scrobbles])

  // Suppress unused-variable lint for registeredAt — retained in props for future use
  void totalScrobbles
  void registeredAt

  if (chapters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Music Story</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not enough history yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Music Story</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col">
          {chapters.map((chapter, idx) => (
            <ChapterCard
              key={chapter.year}
              chapter={chapter}
              isLast={idx === chapters.length - 1}
              username={username}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
