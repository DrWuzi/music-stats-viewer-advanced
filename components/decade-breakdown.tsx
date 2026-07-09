'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface TagEntry {
  name: string
  count: number
}

interface DecadeBreakdownProps {
  topArtists: { name: string; playcount: number }[]
  username: string
}

// Palette using CSS variables via color-mix so we don't hard-code hsl()
const SLICE_COLORS = [
  'var(--primary)',
  'color-mix(in oklch, var(--primary) 75%, var(--background))',
  'color-mix(in oklch, var(--primary) 55%, var(--background))',
  'color-mix(in oklch, var(--primary) 40%, var(--background))',
  'color-mix(in oklch, var(--primary) 28%, var(--background))',
  'color-mix(in oklch, var(--primary) 18%, var(--background))',
  'color-mix(in oklch, var(--foreground) 30%, var(--background))',
  'color-mix(in oklch, var(--foreground) 18%, var(--background))',
]

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
  total: number
}) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div
      className="rounded-md px-3 py-2 text-sm shadow-md"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
      }}
    >
      <p className="font-medium">{name}</p>
      <p style={{ color: 'var(--muted-foreground)' }}>
        {value.toLocaleString()} · {formatPercent(value, total)}
      </p>
    </div>
  )
}

export function DecadeBreakdown({ username }: DecadeBreakdownProps) {
  const [tags, setTags] = useState<TagEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!username) return

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptags&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const raw: { name: string; count: string | number; url: string }[] =
          data?.toptags?.tag ?? []
        const cleaned: TagEntry[] = raw
          .map((t) => ({ name: t.name?.trim() ?? '', count: Number(t.count) }))
          .filter(
            (t) => t.name.length >= 2 && !/^\d+$/.test(t.name) && t.count > 0,
          )
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
        setTags(cleaned)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [username])

  const total = tags.reduce((s, t) => s + t.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Genres</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Loading genre data…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Could not load genre data.
            </p>
          </div>
        )}

        {!loading && !error && tags.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <EmptyState icon={Tag} title="No tag data found for this user." size="compact" />
          </div>
        )}

        {!loading && !error && tags.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={tags}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius="52%"
                outerRadius="72%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {tags.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip total={total} />}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
