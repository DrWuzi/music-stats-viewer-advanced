'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  album: string | null
}

interface YearEntry {
  year: number
  album: string
  artist: string
  count: number
}

function buildYearlyTopAlbums(scrobbles: Scrobble[]): YearEntry[] {
  const counts: Record<number, Record<string, { album: string; artist: string; count: number }>> = {}

  for (const s of scrobbles) {
    if (!s.album) continue
    const year = new Date(s.scrobbledAt).getFullYear()
    const key = `${s.artist}|||${s.album}`
    if (!counts[year]) counts[year] = {}
    if (!counts[year][key]) counts[year][key] = { album: s.album, artist: s.artist, count: 0 }
    counts[year][key].count++
  }

  return Object.entries(counts)
    .map(([yearStr, albums]) => {
      const year = Number(yearStr)
      const top = Object.values(albums).reduce((best, cur) =>
        cur.count > best.count ? cur : best
      )
      return { year, album: top.album, artist: top.artist, count: top.count }
    })
    .sort((a, b) => b.year - a.year)
}

export function YearlyTopAlbum({ scrobbles }: { scrobbles: Scrobble[] }) {
  const entries = buildYearlyTopAlbums(scrobbles)

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Album Each Year</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No album data available.</p>
        </CardContent>
      </Card>
    )
  }

  const mostRecentYear = entries[0]?.year

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Album Each Year</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {entries.map(({ year, album, artist, count }) => {
            const isCurrent = year === mostRecentYear
            return (
              <div
                key={year}
                style={{
                  minWidth: '140px',
                  maxWidth: '160px',
                  flexShrink: 0,
                  borderRadius: '8px',
                  padding: '12px',
                  border: isCurrent
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border)',
                  background: isCurrent ? 'var(--primary)' : 'var(--card)',
                  color: isCurrent ? 'var(--primary-foreground)' : 'var(--card-foreground)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    marginBottom: '6px',
                    opacity: isCurrent ? 1 : 0.6,
                  }}
                >
                  {year}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '1.3',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={album}
                >
                  {album}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    opacity: 0.75,
                    marginBottom: '6px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                  title={artist}
                >
                  {artist}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    opacity: isCurrent ? 0.9 : 0.55,
                  }}
                >
                  {count} plays
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
