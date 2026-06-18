'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArtistImage } from '@/components/artist-image'

const RECENT_SEARCHES_KEY = 'lastfm_recent_searches'
const MAX_RECENT = 8

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]')
  } catch {
    return []
  }
}

function addRecentSearch(q: string) {
  if (!q.trim()) return
  const existing = getRecentSearches().filter((s) => s !== q)
  const updated = [q, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

function removeRecentSearch(q: string) {
  const updated = getRecentSearches().filter((s) => s !== q)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

interface LibraryArtist {
  name: string
  playcount: number
}

function getLibraryArtists(): LibraryArtist[] {
  if (typeof window === 'undefined') return []
  try {
    // Try common localStorage cache keys used by the app
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('topArtists_') || key.startsWith('artists_')) {
        const val = JSON.parse(localStorage.getItem(key) ?? '[]')
        if (Array.isArray(val) && val.length > 0 && 'name' in val[0]) {
          return val as LibraryArtist[]
        }
      }
    }
  } catch {
    // ignore
  }
  return []
}

interface Props {
  initialQ: string
  initialType: string
  username: string
}

export function SearchClient({ initialQ, initialType, username }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [q, setQ] = useState(initialQ)
  const [focused, setFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [libraryArtists, setLibraryArtists] = useState<LibraryArtist[]>([])
  const [type, setType] = useState(initialType || 'all')

  useEffect(() => {
    setRecentSearches(getRecentSearches())
    setLibraryArtists(getLibraryArtists())
  }, [])

  // Save search on navigation
  useEffect(() => {
    if (initialQ) {
      addRecentSearch(initialQ)
      setRecentSearches(getRecentSearches())
    }
  }, [initialQ])

  const filteredSuggestions = q.trim().length >= 1
    ? libraryArtists
        .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
    : []

  const showDropdown = focused && (filteredSuggestions.length > 0 || (q.trim() === '' && recentSearches.length > 0))

  const handleSubmit = useCallback(
    (searchQ: string, searchType?: string) => {
      const resolvedType = searchType ?? type
      const params = new URLSearchParams()
      if (username) params.set('username', username)
      if (searchQ) params.set('q', searchQ)
      if (resolvedType && resolvedType !== 'all') params.set('type', resolvedType)
      router.push(`/search?${params.toString()}`)
    },
    [router, type, username],
  )

  const handleSuggestionClick = (name: string) => {
    addRecentSearch(name)
    router.push(`/artist/${encodeURIComponent(name)}`)
  }

  const handleRecentClick = (term: string) => {
    setQ(term)
    handleSubmit(term)
  }

  const handleRemoveRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    if (q.trim()) {
      handleSubmit(q, newType)
    }
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'users', label: 'Users' },
  ]

  return (
    <div className="space-y-4">
      {/* Search form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) {
            addRecentSearch(q.trim())
            setRecentSearches(getRecentSearches())
          }
          handleSubmit(q)
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search artists, albums, tracks..."
            autoComplete="off"
            className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />

          {/* Dropdown: suggestions or recent searches */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 border rounded-md bg-background shadow-lg max-h-72 overflow-auto"
            >
              {/* Library type-ahead suggestions */}
              {filteredSuggestions.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Your library
                  </p>
                  {filteredSuggestions.map((artist) => (
                    <button
                      key={artist.name}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                      onMouseDown={() => handleSuggestionClick(artist.name)}
                    >
                      <ArtistImage name={artist.name} size="xs" />
                      <span className="flex-1 truncate">{artist.name}</span>
                      {artist.playcount > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {artist.playcount.toLocaleString()} plays
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Recent searches */}
              {q.trim() === '' && recentSearches.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Recent
                  </p>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors cursor-pointer"
                      onMouseDown={() => handleRecentClick(term)}
                    >
                      <svg
                        className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="flex-1 text-sm truncate">{term}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        onMouseDown={(e) => handleRemoveRecent(term, e)}
                        aria-label="Remove"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTypeChange(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              type === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
