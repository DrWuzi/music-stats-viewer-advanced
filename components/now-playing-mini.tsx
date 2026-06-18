'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type NowPlayingData = {
  nowPlaying: boolean
  track?: string
  artist?: string
}

type Props = {
  username: string
}

export function NowPlayingMini({ username }: Props) {
  const [data, setData] = useState<NowPlayingData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const progressAnim = useRef<number | null>(null)

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
          // If a new track started, un-dismiss
          if (json.nowPlaying) setDismissed(false)
        }
      } catch {
        // silently ignore
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 30_000)
    return () => clearInterval(interval)
  }, [username])

  // Animate the fake progress bar back and forth (simulate ~3 min track)
  useEffect(() => {
    if (!data?.nowPlaying) return
    let start: number | null = null
    const duration = 180_000 // 3 minutes in ms

    function step(timestamp: number) {
      if (start === null) start = timestamp
      const elapsed = (timestamp - start) % duration
      const pct = (elapsed / duration) * 100
      if (progressRef.current) {
        progressRef.current.style.width = `${pct}%`
      }
      progressAnim.current = requestAnimationFrame(step)
    }

    progressAnim.current = requestAnimationFrame(step)
    return () => {
      if (progressAnim.current !== null) cancelAnimationFrame(progressAnim.current)
    }
  }, [data?.nowPlaying, data?.track])

  if (!data?.nowPlaying || dismissed) return null

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 items-center gap-3 px-4 h-12 backdrop-blur-md border-t border-border"
      style={{ background: 'color-mix(in oklch, var(--background) 90%, transparent)' }}
      role="status"
      aria-live="polite"
      aria-label="Now playing"
    >
      {/* Animated music note */}
      <span
        className="text-primary text-base shrink-0 animate-bounce"
        aria-hidden="true"
        style={{ animationDuration: '1.2s' }}
      >
        ♫
      </span>

      {/* Track info */}
      <span className="text-sm font-medium truncate flex-1 min-w-0">
        <span className="font-semibold">{data.track}</span>
        {data.artist && (
          <>
            <span className="mx-1.5 text-muted-foreground">—</span>
            <span className="text-muted-foreground">{data.artist}</span>
          </>
        )}
      </span>

      {/* Live indicator */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>

      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss now playing bar"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Fake progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-primary transition-none"
        ref={progressRef}
        style={{ width: '0%' }}
        aria-hidden="true"
      />
    </div>
  )
}
