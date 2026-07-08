'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MusicEvolutionProps {
  scrobbles: { scrobbledAt: Date | string; artist: string }[]
}

const COLORS = [
  'var(--primary)',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
]

const TOP_N = 6

function buildEvolutionData(scrobbles: { scrobbledAt: Date | string; artist: string }[]) {
  if (scrobbles.length === 0) return { rows: [], artists: [] }

  // Aggregate play counts per artist per year
  const yearArtist: Record<number, Record<string, number>> = {}
  const yearTotal: Record<number, number> = {}

  for (const s of scrobbles) {
    const year = new Date(s.scrobbledAt).getUTCFullYear()
    if (!yearArtist[year]) yearArtist[year] = {}
    yearArtist[year][s.artist] = (yearArtist[year][s.artist] ?? 0) + 1
    yearTotal[year] = (yearTotal[year] ?? 0) + 1
  }

  const years = Object.keys(yearArtist).map(Number).sort()
  if (years.length < 2) return { rows: [], artists: [] }

  // For each year find top 6 artists; collect global set of top artists
  const globalArtistScores: Record<string, number> = {}
  const yearTopArtists: Record<number, string[]> = {}

  for (const year of years) {
    const sorted = Object.entries(yearArtist[year]).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, TOP_N).map(([name]) => name)
    yearTopArtists[year] = top
    for (const name of top) {
      globalArtistScores[name] = (globalArtistScores[name] ?? 0) + yearArtist[year][name]
    }
  }

  // Pick up to TOP_N globally prominent artists to use as consistent stack keys
  const globalTopArtists = Object.entries(globalArtistScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([name]) => name)

  // Build rows: each year has pct for each global top artist
  const rows = years.map((year) => {
    const total = yearTotal[year]
    const row: Record<string, string | number> = { year: String(year) }
    for (const artist of globalTopArtists) {
      const count = yearArtist[year][artist] ?? 0
      row[artist] = total > 0 ? Math.round((count / total) * 1000) / 10 : 0
    }
    return row
  })

  return { rows, artists: globalTopArtists }
}

export function MusicEvolution({ scrobbles }: MusicEvolutionProps) {
  const { rows, artists } = useMemo(() => buildEvolutionData(scrobbles), [scrobbles])

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Taste Over Time</CardTitle>
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
        <CardTitle>Your Taste Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Share of plays by top artists per year (%)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value, name) => [`${value}%`, name as string]}
              cursor={{ fill: 'color-mix(in oklch, var(--foreground) 5%, transparent)' }}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {artists.map((artist, i) => (
              <Bar
                key={artist}
                dataKey={artist}
                stackId="stack"
                fill={COLORS[i % COLORS.length]}
                radius={i === artists.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
