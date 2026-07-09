'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Mic2 } from 'lucide-react'
import { artistHref, trackHref } from '@/lib/urls'

interface UnderratedTrack {
  name: string
  artist: string
  globalPlays: number
}

interface UnderratedTracksProps {
  username: string
  topArtists: { name: string }[]
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function UnderratedTracks({ username, topArtists }: UnderratedTracksProps) {
  const [tracks, setTracks] = useState<UnderratedTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username || topArtists.length === 0) {
      setLoading(false)
      return
    }

    async function fetchUnderrated() {
      setLoading(true)
      setError(null)

      try {
        const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY
        const artists = topArtists.slice(0, 3)

        const results = await Promise.all(
          artists.map(async ({ name }) => {
            const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${apiKey}&format=json&limit=50`
            const res = await fetch(url)
            if (!res.ok) return []
            const data = await res.json()
            const raw: { name: string; playcount: string }[] =
              data?.toptracks?.track ?? []
            return raw.map((t) => ({
              name: t.name,
              artist: name,
              globalPlays: Number(t.playcount),
            }))
          })
        )

        const all: UnderratedTrack[] = results.flat()
        const filtered = all
          .filter((t) => t.globalPlays < 100_000 && t.globalPlays > 0)
          .sort((a, b) => a.globalPlays - b.globalPlays)
          .slice(0, 8)

        setTracks(filtered)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracks')
      } finally {
        setLoading(false)
      }
    }

    fetchUnderrated()
  }, [username, topArtists])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="h-5 w-5" />
          Underrated Tracks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div
                  className="h-4 rounded animate-pulse"
                  style={{
                    width: `${55 + (i % 4) * 10}%`,
                    backgroundColor: 'color-mix(in oklch, var(--muted) 60%, transparent)',
                  }}
                />
                <div
                  className="h-3 rounded animate-pulse"
                  style={{
                    width: '35%',
                    backgroundColor: 'color-mix(in oklch, var(--muted) 40%, transparent)',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Could not load underrated tracks.
          </p>
        )}

        {!loading && !error && tracks.length === 0 && (
          <EmptyState
            icon={Mic2}
            title="No underrated tracks found."
            description="Deep cuts appear when your favorite artists have tracks under 100k plays."
            size="compact"
          />
        )}

        {!loading && !error && tracks.length > 0 && (
          <ul className="space-y-3">
            {tracks.map((t) => (
              <li
                key={`${t.artist}-${t.name}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Link
                    href={trackHref(t.artist, t.name, username)}
                    className="text-sm font-medium truncate hover:underline hover:text-primary transition-colors"
                  >
                    {t.name}
                  </Link>
                  <Link
                    href={artistHref(t.artist, username)}
                    className="text-xs truncate hover:underline hover:text-primary transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {t.artist}
                  </Link>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-xs font-mono tabular-nums"
                    style={{
                      backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                      color: 'var(--primary)',
                      border: '1px solid color-mix(in oklch, var(--primary) 25%, transparent)',
                    }}
                  >
                    {formatPlays(t.globalPlays)} plays
                  </Badge>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'color-mix(in oklch, var(--primary) 70%, transparent)' }}
                  >
                    Underrated
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
