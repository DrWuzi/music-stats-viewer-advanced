'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getChartColor } from '@/lib/chart-colors'

interface MusicAgeProps {
  username: string
  topArtists: { name: string; playcount: number }[]
}

interface Tag {
  name: string
  count: number
}

// Maps known decade/era tags to representative years
const DECADE_TAG_MAP: Record<string, number> = {
  '20s': 2022,
  '2020s': 2022,
  '10s': 2015,
  '2010s': 2015,
  '00s': 2005,
  '2000s': 2005,
  '90s': 1995,
  '1990s': 1995,
  '80s': 1985,
  '1980s': 1985,
  '70s': 1975,
  '1970s': 1975,
  '60s': 1965,
  '1960s': 1965,
  '50s': 1955,
  '1950s': 1955,
  '40s': 1945,
  '1940s': 1945,
}

const DECADE_LABELS: Record<number, string> = {
  2022: '2020s',
  2015: '2010s',
  2005: '2000s',
  1995: '1990s',
  1985: '1980s',
  1975: '1970s',
  1965: '1960s',
  1955: '1950s',
  1945: '1940s',
}

function normalizeTagName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '')
}

function matchDecadeTag(tagName: string): number | null {
  const normalized = normalizeTagName(tagName)
  for (const [key, year] of Object.entries(DECADE_TAG_MAP)) {
    if (normalized === key || normalized.includes(key)) {
      return year
    }
  }
  return null
}

export function MusicAge({ username }: MusicAgeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [musicYear, setMusicYear] = useState<number | null>(null)
  const [decadeData, setDecadeData] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    if (!username) return

    async function fetchMusicAge() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/top-tags?username=${encodeURIComponent(username)}&limit=50`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const rawTags: Tag[] = data?.tags ?? []

        // Accumulate weighted counts per decade year
        const decadeCounts: Record<number, number> = {}
        let totalWeight = 0

        for (const tag of rawTags) {
          const year = matchDecadeTag(tag.name)
          if (year !== null) {
            decadeCounts[year] = (decadeCounts[year] ?? 0) + tag.count
            totalWeight += tag.count
          }
        }

        if (totalWeight === 0) {
          setMusicYear(null)
          setDecadeData([])
          return
        }

        // Weighted average year
        let weightedSum = 0
        for (const [yearStr, weight] of Object.entries(decadeCounts)) {
          weightedSum += Number(yearStr) * weight
        }
        const avgYear = Math.round(weightedSum / totalWeight)
        setMusicYear(avgYear)

        // Build pie chart data sorted by decade
        const chartData = Object.entries(decadeCounts)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([yearStr, count]) => ({
            name: DECADE_LABELS[Number(yearStr)] ?? yearStr,
            value: count,
          }))
        setDecadeData(chartData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchMusicAge()
  }, [username])

  const currentYear = 2026
  const tasteAge = musicYear !== null ? currentYear - musicYear : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Music Age</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <div
              className="h-6 w-3/4 rounded animate-pulse"
              style={{ backgroundColor: 'color-mix(in oklch, var(--muted) 60%, transparent)' }}
            />
            <div
              className="h-4 w-1/2 rounded animate-pulse"
              style={{ backgroundColor: 'color-mix(in oklch, var(--muted) 40%, transparent)' }}
            />
            <div
              className="h-40 w-full rounded animate-pulse"
              style={{ backgroundColor: 'color-mix(in oklch, var(--muted) 30%, transparent)' }}
            />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Could not load music age data.
          </p>
        )}

        {!loading && !error && musicYear === null && (
          <EmptyState icon={CalendarClock} title="Not enough decade tags to calculate music age." size="compact" />
        )}

        {!loading && !error && musicYear !== null && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Your music taste is from
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
                {musicYear}
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                on average — your taste is{' '}
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  {tasteAge} years old
                </span>
              </p>
            </div>

            {decadeData.length > 0 && (
              <div role="img" aria-label="Pie chart showing distribution of music taste by decade">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={decadeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {decadeData.map((_, index) => (
                        <Cell key={index} fill={getChartColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const entry = payload[0].payload as { name: string; value: number }
                        const total = decadeData.reduce((s, d) => s + d.value, 0)
                        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 text-sm shadow-md">
                            <span className="font-medium">{entry.name}</span>
                            <span style={{ color: 'var(--muted-foreground)' }}>
                              {' '}
                              — {pct}% of your tags
                            </span>
                          </div>
                        )
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
