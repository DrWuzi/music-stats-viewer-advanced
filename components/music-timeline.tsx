'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Discovery {
  artist: string
  firstHeard: string
  totalPlays: number
}

interface GroupedYear {
  year: number
  entries: Discovery[]
}

function formatMonthYear(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function groupByYear(discoveries: Discovery[]): GroupedYear[] {
  const map: Record<number, Discovery[]> = {}
  for (const d of discoveries) {
    const year = new Date(d.firstHeard).getFullYear()
    if (!map[year]) map[year] = []
    map[year].push(d)
  }
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 5)
    .map((year) => ({ year, entries: map[year] }))
}

export function MusicTimeline({ username }: { username: string }) {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/first-scrobbles?username=${encodeURIComponent(username)}&limit=50`)
      .then((r) => r.json())
      .then((data) => setDiscoveries(data.discoveries ?? []))
      .catch(() => setDiscoveries([]))
      .finally(() => setLoading(false))
  }, [username])

  const grouped = groupByYear(discoveries)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Music Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading&hellip;</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No listening history found.</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ year, entries }) => (
              <div key={year}>
                <div className="text-base font-semibold mb-2 text-muted-foreground">{year}</div>
                <div className="space-y-2 pl-3 border-l border-border">
                  {entries.map((d) => (
                    <div key={d.artist} className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatMonthYear(d.firstHeard)}
                      </span>
                      <span className="text-sm">
                        You first heard{' '}
                        <span className="font-medium">{d.artist}</span>{' '}
                        <span className="text-muted-foreground">
                          ({d.totalPlays} total {d.totalPlays === 1 ? 'play' : 'plays'})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
