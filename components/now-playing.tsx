'use client'

import { ArtistImage } from '@/components/artist-image'
import { ListenOn } from '@/components/listen-on'
import { useNowPlaying } from '@/components/now-playing-context'

export function NowPlaying() {
  const { data } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] rounded-r-lg text-sm w-full">
      {data.artist && (
        <ArtistImage name={data.artist} size="sm" className="shrink-0" />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-base leading-none" aria-label="Now playing">♫</span>
          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Now Playing</span>
          <span className="relative flex h-2 w-2 shrink-0 ml-auto">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="font-semibold truncate leading-snug">{data.track}</span>
        {(data.artist || data.album) && (
          <span className="text-muted-foreground truncate text-xs">
            {data.artist}
            {data.artist && data.album && ' · '}
            {data.album}
          </span>
        )}
      </div>
      {data.artist && data.track && (
        <ListenOn type="track" artist={data.artist} track={data.track} variant="icons" />
      )}
    </div>
  )
}
