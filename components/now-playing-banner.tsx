'use client'

import { useNowPlaying } from '@/components/now-playing-context'

export function NowPlayingBanner() {
  const { data } = useNowPlaying()

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
