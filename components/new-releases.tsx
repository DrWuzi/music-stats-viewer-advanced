'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Release {
  album: string
  artist: string
  imageUrl: string
}

export function NewReleases({ username }: { username: string }) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/new-releases?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        setReleases(data.releases ?? [])
      })
      .catch(() => setReleases([]))
      .finally(() => setLoading(false))
  }, [username])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unheard From Your Artists</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : releases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unheard albums found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {releases.map((r) => (
              <div
                key={`${r.artist}-${r.album}`}
                className="flex flex-col gap-2"
              >
                {r.imageUrl ? (
                  <img
                    src={r.imageUrl}
                    alt={`${r.album} by ${r.artist}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center px-2">No image</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-tight line-clamp-2">{r.album}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.artist}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
