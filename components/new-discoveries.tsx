'use client'

import { useEffect, useState } from 'react'
import { Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Discovery {
  artist: string
  firstHeard: string
  playcount: number
}

type Period = 30 | 90 | 180

const PERIODS: { label: string; value: Period }[] = [
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '180d', value: 180 },
]

function daysAgo(isoString: string): number {
  const ms = Date.now() - new Date(isoString).getTime()
  return Math.floor(ms / 86400000)
}

export function NewDiscoveries({ username }: { username: string }) {
  const [days, setDays] = useState<Period>(30)
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/new-discoveries?username=${encodeURIComponent(username)}&days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        setDiscoveries(data.discoveries ?? [])
      })
      .catch(() => setDiscoveries([]))
      .finally(() => setLoading(false))
  }, [username, days])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>New Discoveries</CardTitle>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  days === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : discoveries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
            <Compass className="h-8 w-8 opacity-40" />
            <p className="text-sm">No new discoveries in this period.</p>
            <p className="text-xs opacity-70">Try a longer window to surface more first-time artists.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {discoveries.map((d) => {
              const ago = daysAgo(d.firstHeard)
              return (
                <div
                  key={d.artist}
                  className="flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2"
                >
                  <span className="text-sm font-medium">{d.artist}</span>
                  <span className="text-xs text-muted-foreground">
                    first heard {ago === 0 ? 'today' : `${ago}d ago`}
                  </span>
                  <Badge variant="secondary" className="mt-1 w-fit">
                    {d.playcount} {d.playcount === 1 ? 'play' : 'plays'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
