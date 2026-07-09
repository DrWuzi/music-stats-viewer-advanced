'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface TopCollaborationsProps {
  scrobbles: Scrobble[]
  username: string
}

interface ArtistPair {
  artist1: string
  artist2: string
  count: number
}

function groupIntoSessions(scrobbles: Scrobble[]): string[][] {
  if (scrobbles.length === 0) return []

  const sorted = [...scrobbles].sort(
    (a, b) => a.scrobbledAt.getTime() - b.scrobbledAt.getTime()
  )

  const sessions: string[][] = []
  let currentSession: string[] = [sorted[0].artist]
  let lastTime = sorted[0].scrobbledAt.getTime()

  for (let i = 1; i < sorted.length; i++) {
    const time = sorted[i].scrobbledAt.getTime()
    const diffMinutes = (time - lastTime) / 60000

    if (diffMinutes <= 30) {
      currentSession.push(sorted[i].artist)
    } else {
      sessions.push(currentSession)
      currentSession = [sorted[i].artist]
    }
    lastTime = time
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession)
  }

  return sessions
}

function computePairCounts(sessions: string[][]): ArtistPair[] {
  const pairMap = new Map<string, { artist1: string; artist2: string; count: number }>()

  for (const session of sessions) {
    const uniqueArtists = [...new Set(session)]
    if (uniqueArtists.length < 2) continue

    for (let i = 0; i < uniqueArtists.length; i++) {
      for (let j = i + 1; j < uniqueArtists.length; j++) {
        const a = uniqueArtists[i]
        const b = uniqueArtists[j]
        const key = [a, b].sort().join('|||')

        const existing = pairMap.get(key)
        if (existing) {
          existing.count++
        } else {
          const sorted = [a, b].sort()
          pairMap.set(key, { artist1: sorted[0], artist2: sorted[1], count: 1 })
        }
      }
    }
  }

  return Array.from(pairMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

export function TopCollaborations({ scrobbles, username }: TopCollaborationsProps) {
  const pairs = useMemo(() => {
    const sessions = groupIntoSessions(scrobbles)
    return computePairCounts(sessions)
  }, [scrobbles])

  if (pairs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold mb-4">Top Collaborations</h2>
        <EmptyState icon={Users} title="Not enough data to show artist pairs." size="compact" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold mb-4">Top Collaborations</h2>
      <ul className="space-y-3">
        {pairs.map((pair, index) => (
          <li
            key={`${pair.artist1}|||${pair.artist2}`}
            className="flex items-center gap-3"
          >
            <span className="w-5 text-xs text-[var(--muted-foreground)] text-right shrink-0">
              {index + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ArtistImage name={pair.artist1} size="sm" />
              <span className="text-[var(--muted-foreground)] text-sm font-medium shrink-0">×</span>
              <ArtistImage name={pair.artist2} size="sm" />
              <div className="min-w-0 flex-1 ml-1">
                <p className="text-sm font-medium leading-tight truncate">
                  <Link href={artistHref(pair.artist1, username)} className="hover:underline">
                    {pair.artist1}
                  </Link>
                  {' & '}
                  <Link href={artistHref(pair.artist2, username)} className="hover:underline">
                    {pair.artist2}
                  </Link>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {pair.count} session{pair.count !== 1 ? 's' : ''} together
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
