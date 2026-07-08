'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { albumHref, artistHref } from '@/lib/urls'

interface AlbumResult {
  album: string
  artist: string
  totalTracks: number
  scrobbledTracks: number
  pct: number
}

interface Props {
  username: string
}

export function AlbumCompletion({ username }: Props) {
  const [albums, setAlbums] = useState<AlbumResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/album-completion?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load album completion data')
        return res.json() as Promise<{ albums: AlbumResult[] }>
      })
      .then((data) => {
        setAlbums(data.albums ?? [])
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [username])

  return (
    <Card>
      <CardHeader><CardTitle>Album Completion</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading album data…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : albums.length === 0 ? (
          <p className="text-sm text-muted-foreground">No album data available.</p>
        ) : (
          <div className="space-y-4">
            {albums.map((a) => (
              <div key={`${a.artist}-${a.album}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={albumHref(a.artist, a.album, username)}
                      className="text-sm font-medium truncate block hover:underline"
                    >
                      {a.album}
                    </Link>
                    <Link
                      href={artistHref(a.artist, username)}
                      className="text-xs text-muted-foreground truncate block hover:underline"
                    >
                      {a.artist}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{a.pct}%</p>
                    <p className="text-xs text-muted-foreground">
                      {a.scrobbledTracks}/{a.totalTracks} tracks
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
