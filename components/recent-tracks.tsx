'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

interface Track {
  artist: string
  album: string | null
  track: string
  scrobbledAt: Date | string
}

function fmt(date: Date): string {
  const today = new Date()
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today ${time}`
  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)
  if (date.toDateString() === yest.toDateString()) return `Yesterday ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
}

export function RecentTracks({ tracks, isOwner, username }: { tracks: Track[]; isOwner?: boolean; username: string }) {
  const [lovedMap, setLovedMap] = useState<Record<string, boolean>>({})

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
          <p className="text-sm text-muted-foreground">No tracks scrobbled yet.</p>
        ) : (
          <ul className="divide-y">
            {tracks.map((t, i) => {
              const date = new Date(t.scrobbledAt)
              const key = t.artist + '::' + t.track
              const loved = lovedMap[key] ?? false
              return (
                <li key={i} className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors duration-150 hover:bg-muted/50">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{t.track}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      <Link
                        href={`/artist/${encodeURIComponent(t.artist)}?username=${encodeURIComponent(username)}`}
                        className="hover:underline hover:text-foreground transition-colors"
                      >
                        {t.artist}
                      </Link>
                      {t.album ? ` — ${t.album}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className="text-xs text-muted-foreground">{fmt(date)}</span>
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
      </CardContent>
    </Card>
  )
}
