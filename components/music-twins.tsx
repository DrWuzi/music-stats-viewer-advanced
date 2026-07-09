'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface MusicTwinsProps {
  username: string
  topArtists: { name: string }[]
}

interface Twin {
  username: string
  similarity: number
  sharedCount: number
  sharedArtists: string[]
}

export function MusicTwins({ username, topArtists }: MusicTwinsProps) {
  const [twins, setTwins] = useState<Twin[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTwins = useCallback(() => {
    if (!username || topArtists.length === 0) return

    setLoading(true)
    setError(null)

    fetch(`/api/music-twins?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch music twins')
        return res.json()
      })
      .then((data: { twins: Twin[] }) => {
        setTwins(data.twins)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [username, topArtists.length])

  useEffect(() => {
    fetchTwins()
  }, [fetchTwins])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Music Twins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground">Finding your music twins…</p>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">Failed to load. Retry?</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTwins}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && twins !== null && twins.length === 0 && (
          <EmptyState
            icon={Users}
            title="Not enough users in the database yet to find twins. Check back later!"
            size="compact"
          />
        )}

        {!loading && !error && twins !== null && twins.length > 0 && (
          <ul className="flex flex-col gap-3">
            {twins.map((twin) => (
              <li key={twin.username} className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Link
                    href={`/user/${encodeURIComponent(twin.username)}`}
                    className="text-sm font-medium hover:underline truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {twin.username}
                  </Link>
                  <span className="text-xs text-muted-foreground truncate">
                    {twin.sharedCount} artist{twin.sharedCount !== 1 ? 's' : ''} in common
                  </span>
                </div>
                <div
                  className="text-sm font-semibold tabular-nums shrink-0 rounded-md px-2 py-0.5"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--primary) 15%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  {twin.similarity}%
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && twins === null && topArtists.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No top artist data available to find twins.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
