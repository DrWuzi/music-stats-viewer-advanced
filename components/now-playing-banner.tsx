'use client'

import Link from 'next/link'
import { useNowPlaying } from '@/components/now-playing-context'
import { artistHref, trackHref } from '@/lib/urls'

export function NowPlayingBanner() {
  const { data, username } = useNowPlaying()

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
        {data.artist && data.track ? (
          <Link href={trackHref(data.artist, data.track, username)} className="hover:underline">
            {data.track}
          </Link>
        ) : (
          data.track
        )}
      </span>
      {data.artist && (
        <>
          <span className="text-muted-foreground shrink-0">—</span>
          <span className="text-muted-foreground font-medium truncate">
            <Link href={artistHref(data.artist, username)} className="hover:underline">
              {data.artist}
            </Link>
          </span>
        </>
      )}
    </div>
  )
}
