'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickLoveButtonProps {
  artist: string
  track: string
  initialLoved?: boolean
  className?: string
}

export function QuickLoveButton({
  artist,
  track,
  initialLoved = false,
  className,
}: QuickLoveButtonProps) {
  const [loved, setLoved] = useState(initialLoved)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    const nextLoved = !loved
    setLoved(nextLoved)
    setPending(true)
    try {
      const res = await fetch('/api/track/love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, track, unlove: !nextLoved }),
      })
      if (!res.ok) {
        setLoved(!nextLoved)
      }
    } catch {
      setLoved(!nextLoved)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={loved ? 'Unlove track' : 'Love track'}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1.5 transition-colors',
        'hover:bg-[color-mix(in_oklch,var(--muted)_60%,transparent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        className,
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          loved
            ? 'fill-red-500 stroke-red-500'
            : 'fill-none stroke-[var(--muted-foreground)]',
        )}
      />
    </button>
  )
}
