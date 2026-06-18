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

export function NowPlayingBanner({ username }: Props) {
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
    <div
      className="w-full flex items-center gap-3 px-5 py-3 rounded-xl mb-4 border border-primary/20"
      style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
    >
      <span className="animate-pulse text-xl leading-none select-none" aria-hidden="true">
        ♫
      </span>
      <span className="font-bold text-foreground text-sm tracking-wide uppercase shrink-0">
        Now playing:
      </span>
      <span className="font-bold text-foreground truncate">
        {data.track}
      </span>
      {data.artist && (
        <>
          <span className="text-muted-foreground shrink-0">—</span>
          <span className="text-muted-foreground font-medium truncate">
            {data.artist}
          </span>
        </>
      )}
    </div>
  )
}
