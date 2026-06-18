'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface RecentArtistsCarouselProps {
  scrobbles: Scrobble[]
}

function getRecentDistinctArtists(scrobbles: Scrobble[], limit = 10): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  // scrobbles should already be ordered newest-first, but sort defensively
  const sorted = [...scrobbles].sort(
    (a, b) => new Date(b.scrobbledAt).getTime() - new Date(a.scrobbledAt).getTime(),
  )

  for (const s of sorted) {
    if (!seen.has(s.artist)) {
      seen.add(s.artist)
      result.push(s.artist)
      if (result.length === limit) break
    }
  }

  return result
}

export function RecentArtistsCarousel({ scrobbles }: RecentArtistsCarouselProps) {
  const artists = getRecentDistinctArtists(scrobbles)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (artists.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  return (
    <div className="relative group">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {artists.map((artist) => (
          <Link
            key={artist}
            href={`/artist/${encodeURIComponent(artist)}`}
            className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[72px] shrink-0 group/item"
          >
            <ArtistImage
              name={artist}
              size="md"
              className="ring-2 ring-transparent group-hover/item:ring-primary transition-all"
            />
            <span
              className="text-xs text-muted-foreground text-center leading-tight line-clamp-2 w-full group-hover/item:text-foreground transition-colors"
              title={artist}
            >
              {artist}
            </span>
          </Link>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  )
}
