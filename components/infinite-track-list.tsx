'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { artistHref, trackHref } from '@/lib/urls'

interface Track {
  artist: string
  track: string
  album: string | null
  scrobbledAt: Date | string
}

interface InfiniteTrackListProps {
  username: string
  initialTracks: Track[]
  total: number
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const d = date.toDateString()
  if (d === today.toDateString()) return 'Today'
  if (d === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function groupByDate(tracks: Track[]): { label: string; tracks: Track[] }[] {
  const groups: { label: string; tracks: Track[] }[] = []
  const labelMap = new Map<string, Track[]>()

  for (const t of tracks) {
    const date = new Date(t.scrobbledAt)
    const label = getDateLabel(date)
    if (!labelMap.has(label)) {
      labelMap.set(label, [])
      groups.push({ label, tracks: labelMap.get(label)! })
    }
    labelMap.get(label)!.push(t)
  }

  return groups
}

export function InfiniteTrackList({ username, initialTracks, total }: InfiniteTrackListProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialTracks.length < total)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          const nextPage = page + 1
          setLoading(true)
          fetch(`/api/scrobbles?username=${encodeURIComponent(username)}&page=${nextPage}&limit=50`)
            .then((res) => res.json())
            .then((data: { tracks: Track[]; total: number; page: number; hasMore: boolean }) => {
              setTracks((prev) => [...prev, ...data.tracks])
              setPage(nextPage)
              setHasMore(data.hasMore)
            })
            .catch(() => {
              // silently ignore fetch errors, user can scroll again
            })
            .finally(() => {
              setLoading(false)
            })
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [username, page, loading, hasMore])

  const groups = groupByDate(tracks)

  return (
    <div className="flex flex-col gap-0">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="sticky top-0 z-10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: 'color-mix(in oklch, var(--background) 95%, transparent)', borderBottom: '1px solid var(--border)' }}>
            {group.label}
          </div>
          <ul>
            {group.tracks.map((t, i) => {
              const date = new Date(t.scrobbledAt)
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                      <Link
                        href={trackHref(t.artist, t.track, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.track}
                      </Link>
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      <Link
                        href={artistHref(t.artist, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.artist}
                      </Link>
                      {t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
                  <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                    {formatTime(date)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div ref={sentinelRef} className="h-1" />

      <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
        {loading && (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more scrobbles…
          </span>
        )}
        {!loading && !hasMore && (
          <span>All {total.toLocaleString()} scrobbles loaded</span>
        )}
        {!loading && hasMore && (
          <span>Showing {tracks.length.toLocaleString()} of {total.toLocaleString()}</span>
        )}
      </div>
    </div>
  )
}
