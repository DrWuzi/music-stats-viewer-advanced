'use client'

import { useEffect, useState } from 'react'

type NowPlayingData = {
  nowPlaying: boolean
  track?: string
  artist?: string
  album?: string
}

type Props = {
  username: string
}

export function NowPlaying({ username }: Props) {
  const [data, setData] = useState<NowPlayingData | null>(null)

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch(
          `/api/now-playing?username=${encodeURIComponent(username)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const json: NowPlayingData = await res.json()
          setData(json)
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchNowPlaying()

    const interval = setInterval(fetchNowPlaying, 30_000)
    return () => clearInterval(interval)
  }, [username])

  if (!data?.nowPlaying) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-md text-sm w-full">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-muted-foreground font-medium">Now Playing:</span>
      <span className="font-semibold truncate">{data.track}</span>
      {data.artist && (
        <>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground truncate">{data.artist}</span>
        </>
      )}
    </div>
  )
}
