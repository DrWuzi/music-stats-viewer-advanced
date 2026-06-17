'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gem } from 'lucide-react'

interface GemItem {
  track: string
  artist: string
  userPlays: number
  globalPlays: number
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function HiddenGems({ username }: { username: string }) {
  const [gems, setGems] = useState<GemItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/hidden-gems?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        setGems(data.gems ?? [])
      })
      .catch(() => setGems([]))
      .finally(() => setLoading(false))
  }, [username])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gem className="h-5 w-5" />
          Hidden Gems
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Finding your hidden gems…</p>
        ) : gems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hidden gems found.</p>
        ) : (
          <ul className="space-y-3">
            {gems.map((g) => (
              <li key={`${g.artist}-${g.track}`} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{g.track}</span>
                <span className="text-xs text-muted-foreground">{g.artist}</span>
                <span className="text-xs text-muted-foreground">
                  You: {formatPlays(g.userPlays)} plays · World: {formatPlays(g.globalPlays)} plays
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
