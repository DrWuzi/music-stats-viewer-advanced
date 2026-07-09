'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Heart, Music } from 'lucide-react'
import { formatRelative } from '@/lib/format-date'
import { ArtistImage } from '@/components/artist-image'

interface Track {
  artist: string
  album: string | null
  track: string
  scrobbledAt: Date | string
}

export function RecentTracks({ tracks, isOwner, username }: { tracks: Track[]; isOwner?: boolean; username: string }) {
  const [lovedMap, setLovedMap] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState(20)

  async function toggleLove(artist: string, track: string) {
    const key = artist + '::' + track
    const current = lovedMap[key] ?? false
    setLovedMap((prev) => ({ ...prev, [key]: !current }))
    try {
      const res = await fetch('/api/loved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, track, action: current ? 'unlove' : 'love' }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setLovedMap((prev) => ({ ...prev, [key]: current }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <EmptyState icon={Music} title="No tracks scrobbled yet." size="compact" />
        ) : (
          <ul className="divide-y">
            {tracks.slice(0, shown).map((t, i) => {
              const key = t.artist + '::' + t.track
              const loved = lovedMap[key] ?? false
              return (
                <li key={i} className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors duration-150 hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Link href={`/artist/${encodeURIComponent(t.artist)}${username ? `?username=${username}` : ''}`} className="shrink-0">
                      <ArtistImage name={t.artist} size="xs" />
                    </Link>
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/track/${encodeURIComponent(t.artist)}/${encodeURIComponent(t.track)}`}
                        className="font-medium truncate hover:underline text-foreground"
                      >
                        {t.track}
                      </Link>
                      <span className="text-sm text-muted-foreground truncate">
                        <Link
                          href={`/artist/${encodeURIComponent(t.artist)}${username ? `?username=${username}` : ''}`}
                          className="hover:underline hover:text-foreground transition-colors"
                        >
                          {t.artist}
                        </Link>
                        {t.album ? ` — ${t.album}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatRelative(t.scrobbledAt)}</span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLove(t.artist, t.track)}
                        aria-label={loved ? 'Unlove track' : 'Love track'}
                        className="p-1 h-auto"
                      >
                        <Heart
                          size={16}
                          fill={loved ? 'red' : 'none'}
                          stroke={loved ? 'red' : 'currentColor'}
                        />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {tracks.length > shown && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setShown((prev) => prev + 20)}>
              Load 20 more ({tracks.length - shown} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
