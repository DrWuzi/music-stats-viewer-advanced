'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, X, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref, trackHref } from '@/lib/urls'

interface TopArtist {
  name: string
  playcount: number
}

interface TopTrack {
  name: string
  artist: string
  playcount: number
}

interface ProfileSearchProps {
  topArtists: TopArtist[]
  topTracks: TopTrack[]
  username: string
}

export function ProfileSearch({ topArtists, topTracks, username }: ProfileSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const showDropdown = isOpen && normalizedQuery.length > 1

  const filteredArtists = showDropdown
    ? topArtists.filter((a) => a.name.toLowerCase().includes(normalizedQuery)).slice(0, 5)
    : []

  const filteredTracks = showDropdown
    ? topTracks
        .filter(
          (t) =>
            t.name.toLowerCase().includes(normalizedQuery) ||
            t.artist.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 5)
    : []

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close on click outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleClear() {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className="flex items-center gap-2 rounded-md border px-3 py-2"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search artists and tracks…"
          value={query}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          style={{ color: 'var(--foreground)' }}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-sm hover:opacity-70 transition-opacity"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </button>
        )}
      </div>

      {showDropdown && (filteredArtists.length > 0 || filteredTracks.length > 0) && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {filteredArtists.length > 0 && (
            <section>
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}
              >
                Artists ({filteredArtists.length})
              </div>
              <ul>
                {filteredArtists.map((a) => (
                  <li key={a.name}>
                    <Link
                      href={artistHref(a.name, username)}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {a.name}
                      </span>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {a.playcount.toLocaleString()} plays
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filteredTracks.length > 0 && (
            <section>
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: 'var(--muted-foreground)',
                  borderTop: filteredArtists.length > 0 ? '1px solid var(--border)' : undefined,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                Tracks ({filteredTracks.length})
              </div>
              <ul>
                {filteredTracks.map((t, i) => (
                  <li key={i}>
                    <Link
                      href={trackHref(t.artist, t.name, username)}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {t.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                          {t.artist}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {t.playcount.toLocaleString()} plays
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {showDropdown && filteredArtists.length === 0 && filteredTracks.length === 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border shadow-lg px-3 py-4 text-sm text-center"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <EmptyState icon={SearchX} title={`No results for "${query}"`} size="compact" />
        </div>
      )}
    </div>
  )
}
