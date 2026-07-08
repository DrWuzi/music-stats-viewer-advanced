'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { artistHref } from '@/lib/urls'

interface TrackEntry {
  name: string
  artist: string
}

interface PlaylistBuilderProps {
  username: string
  topTracksOverall: { name: string; artist: string; playcount: number }[]
  topTracksMonth: { name: string; artist: string; playcount: number }[]
  lovedTracks: { artist: string; track: string }[]
  recentTracks: { artist: string; track: string; album: string }[]
}

type Preset = 'overall' | 'month' | 'loved' | 'recent'

export function PlaylistBuilder({
  username,
  topTracksOverall,
  topTracksMonth,
  lovedTracks,
  recentTracks,
}: PlaylistBuilderProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [tracks, setTracks] = useState<TrackEntry[]>([])
  const [checkedTracks, setCheckedTracks] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  function loadPreset(preset: Preset) {
    let loaded: TrackEntry[] = []
    if (preset === 'overall') {
      loaded = topTracksOverall.slice(0, 50).map((t) => ({ name: t.name, artist: t.artist }))
    } else if (preset === 'month') {
      loaded = topTracksMonth.slice(0, 50).map((t) => ({ name: t.name, artist: t.artist }))
    } else if (preset === 'loved') {
      loaded = lovedTracks.map((t) => ({ name: t.track, artist: t.artist }))
    } else if (preset === 'recent') {
      loaded = recentTracks.slice(0, 50).map((t) => ({ name: t.track, artist: t.artist }))
    }
    setSelectedPreset(preset)
    setTracks(loaded)
    setCheckedTracks(new Set(loaded.map((_, i) => i)))
    setSearch('')
  }

  const filteredIndices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tracks
      .map((t, i) => ({ t, i }))
      .filter(({ t }) =>
        q === '' ||
        t.name.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
      )
      .map(({ i }) => i)
  }, [tracks, search])

  function toggleTrack(idx: number) {
    setCheckedTracks((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function selectAll() {
    setCheckedTracks(new Set(filteredIndices))
  }

  function deselectAll() {
    setCheckedTracks((prev) => {
      const next = new Set(prev)
      for (const i of filteredIndices) next.delete(i)
      return next
    })
  }

  const checkedList = tracks.filter((_, i) => checkedTracks.has(i))

  function copyAsText() {
    const text = checkedList.map((t, i) => `${i + 1}. ${t.name} - ${t.artist}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadM3U() {
    const lines = ['#EXTM3U']
    for (const t of checkedList) {
      lines.push(`#EXTINF:-1,${t.artist} - ${t.name}`)
      lines.push(`${t.artist} - ${t.name}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${username}-playlist.m3u`
    a.click()
    URL.revokeObjectURL(url)
  }

  const presets: { id: Preset; label: string }[] = [
    { id: 'overall', label: 'All-Time Top 50' },
    { id: 'month', label: 'This Month' },
    { id: 'loved', label: 'Loved Tracks' },
    { id: 'recent', label: 'Recent 50' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playlist Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.id}
              variant={selectedPreset === p.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => loadPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {tracks.length > 0 && (
          <>
            {/* Search */}
            <Input
              placeholder="Search tracks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Controls row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">
                {checkedTracks.size} track{checkedTracks.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Track list */}
            <div className="overflow-y-auto max-h-96 border rounded-md divide-y divide-border">
              {filteredIndices.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No tracks match your search.</p>
              ) : (
                filteredIndices.map((idx) => {
                  const t = tracks[idx]
                  const checked = checkedTracks.has(idx)
                  return (
                    <div
                      key={idx}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onClick={() => toggleTrack(idx)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          toggleTrack(idx)
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTrack(idx)}
                        className="accent-primary w-4 h-4 shrink-0 pointer-events-none"
                        tabIndex={-1}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">{t.name}</span>
                        <Link
                          href={artistHref(t.artist, username)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground block truncate hover:underline hover:text-foreground w-fit"
                        >
                          {t.artist}
                        </Link>
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAsText}
                disabled={checkedTracks.size === 0}
              >
                {copied ? 'Copied!' : 'Copy as Text'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadM3U}
                disabled={checkedTracks.size === 0}
              >
                Download .m3u
              </Button>
            </div>
          </>
        )}

        {tracks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Select a preset above to load tracks.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
