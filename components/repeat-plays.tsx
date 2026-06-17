'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RepeatTrack {
  track: string
  artist: string
  count: number
}

type Threshold = 10 | 25 | 50 | 100

const THRESHOLDS: { label: string; value: Threshold }[] = [
  { label: '10×', value: 10 },
  { label: '25×', value: 25 },
  { label: '50×', value: 50 },
  { label: '100×', value: 100 },
]

export function RepeatPlays({ username }: { username: string }) {
  const [threshold, setThreshold] = useState<Threshold>(10)
  const [tracks, setTracks] = useState<RepeatTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/repeat-plays?username=${encodeURIComponent(username)}&min=${threshold}`)
      .then((r) => r.json())
      .then((data) => {
        setTracks(data.tracks ?? [])
      })
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [username, threshold])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Obsessions</CardTitle>
          <div className="flex gap-1">
            {THRESHOLDS.map((t) => (
              <button
                key={t.value}
                onClick={() => setThreshold(t.value)}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  threshold === t.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tracks played {threshold}+ times.
          </p>
        ) : (
          <ol className="space-y-2">
            {tracks.map((t, i) => (
              <li
                key={`${t.artist}-${t.track}`}
                className="flex items-center gap-3 py-1.5 border-b last:border-0"
              >
                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 text-right">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.track}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {t.count.toLocaleString('en-US')}×
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
