'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RotateCcw } from 'lucide-react'

interface Rediscovery {
  artist: string
  gapDays: number
  lastHeard: string
}

export function Rediscovery({ username }: { username: string }) {
  const [rediscoveries, setRediscoveries] = useState<Rediscovery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/rediscovery?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        setRediscoveries(data.rediscoveries ?? [])
      })
      .catch(() => setRediscoveries([]))
      .finally(() => setLoading(false))
  }, [username])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rediscovered</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rediscoveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rediscovered artists in the last 60 days.
          </p>
        ) : (
          <div className="space-y-2">
            {rediscoveries.map((r) => (
              <div
                key={r.artist}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.artist}</p>
                  <p className="text-xs text-muted-foreground">
                    last heard{' '}
                    {new Date(r.lastHeard).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                  Back after {r.gapDays.toLocaleString('en-US')} days
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
