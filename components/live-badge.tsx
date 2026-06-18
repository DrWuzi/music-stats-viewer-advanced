'use client'

import { useEffect, useState } from 'react'

type Props = {
  username: string
}

export function LiveBadge({ username }: Props) {
  const [live, setLive] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `/api/now-playing?username=${encodeURIComponent(username)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const json = await res.json()
          setLive(!!json.nowPlaying)
        }
      } catch {
        // silently ignore
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [username])

  if (!live) return null

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
