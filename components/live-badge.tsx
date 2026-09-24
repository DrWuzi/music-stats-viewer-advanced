'use client'

import { useNowPlaying } from '@/components/now-playing-context'

export function LiveBadge() {
  const { data } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'color-mix(in oklch, var(--success, oklch(0.7 0.2 145)) 15%, transparent)', color: 'oklch(0.55 0.18 145)' }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: 'oklch(0.7 0.2 145)' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ backgroundColor: 'oklch(0.6 0.2 145)' }} />
      </span>
      Live
    </span>
  )
}
