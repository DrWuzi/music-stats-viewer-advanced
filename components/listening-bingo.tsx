'use client'

import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Scrobble {
  scrobbledAt: Date | string
  artist: string
  track: string
}

interface ListeningBingoProps {
  scrobbles: Scrobble[]
  totalScrobbles: number
}

interface BingoSquare {
  id: string
  label: string
  check: (scrobbles: Scrobble[], totalScrobbles: number) => boolean
  free?: boolean
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const BINGO_SQUARES: BingoSquare[] = [
  {
    id: 'midnight',
    label: 'Listened at midnight',
    check: (scrobbles) =>
      scrobbles.some((s) => new Date(s.scrobbledAt).getHours() === 0),
  },
  {
    id: '100_plays_artist',
    label: '100+ plays of one artist',
    check: (scrobbles) => {
      const counts: Record<string, number> = {}
      for (const s of scrobbles) {
        counts[s.artist] = (counts[s.artist] ?? 0) + 1
      }
      return Object.values(counts).some((c) => c >= 100)
    },
  },
  {
    id: '7_day_streak',
    label: 'Listened 7 days in a row',
    check: (scrobbles) => {
      if (scrobbles.length === 0) return false
      const uniqueDates = Array.from(
        new Set(scrobbles.map((s) => toDateString(new Date(s.scrobbledAt))))
      ).sort()
      let run = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1])
        const curr = new Date(uniqueDates[i])
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays === 1) {
          run++
          if (run >= 7) return true
        } else {
          run = 1
        }
      }
      return false
    },
  },
  {
    id: '5_new_artists',
    label: 'Discovered 5 new artists this month',
    check: (scrobbles) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const prevMonthScrobbles = scrobbles.filter(
        (s) => new Date(s.scrobbledAt) < monthStart
      )
      const prevArtists = new Set(prevMonthScrobbles.map((s) => s.artist))
      const thisMonthArtists = new Set(
        scrobbles
          .filter((s) => new Date(s.scrobbledAt) >= monthStart)
          .map((s) => s.artist)
      )
      let newCount = 0
      for (const a of thisMonthArtists) {
        if (!prevArtists.has(a)) newCount++
      }
      return newCount >= 5
    },
  },
  {
    id: 'same_song_3x',
    label: 'Played same song 3x in a row',
    check: (scrobbles) => {
      if (scrobbles.length < 3) return false
      const sorted = [...scrobbles].sort(
        (a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime()
      )
      let run = 1
      for (let i = 1; i < sorted.length; i++) {
        if (
          sorted[i].track === sorted[i - 1].track &&
          sorted[i].artist === sorted[i - 1].artist
        ) {
          run++
          if (run >= 3) return true
        } else {
          run = 1
        }
      }
      return false
    },
  },
  {
    id: 'weekend_marathon',
    label: 'Weekend marathon (50+ songs)',
    check: (scrobbles) => {
      const bySaturday: Record<string, number> = {}
      for (const s of scrobbles) {
        const d = new Date(s.scrobbledAt)
        const dow = d.getDay()
        if (dow === 0 || dow === 6) {
          const weekKey = toDateString(d)
          bySaturday[weekKey] = (bySaturday[weekKey] ?? 0) + 1
        }
      }
      return Object.values(bySaturday).some((c) => c >= 50)
    },
  },
  {
    id: 'early_bird',
    label: 'Early bird (listened before 7am)',
    check: (scrobbles) =>
      scrobbles.some((s) => {
        const h = new Date(s.scrobbledAt).getHours()
        return h >= 4 && h < 7
      }),
  },
  {
    id: '500_total',
    label: '500+ total scrobbles',
    check: (_, totalScrobbles) => totalScrobbles >= 500,
  },
  {
    id: 'night_session',
    label: 'Late-night session (10+ songs after midnight)',
    check: (scrobbles) => {
      const byDate: Record<string, number> = {}
      for (const s of scrobbles) {
        const d = new Date(s.scrobbledAt)
        if (d.getHours() >= 0 && d.getHours() < 5) {
          const key = toDateString(d)
          byDate[key] = (byDate[key] ?? 0) + 1
        }
      }
      return Object.values(byDate).some((c) => c >= 10)
    },
  },
  {
    id: '10_artists_day',
    label: 'Listened to 10+ artists in one day',
    check: (scrobbles) => {
      const byDay: Record<string, Set<string>> = {}
      for (const s of scrobbles) {
        const key = toDateString(new Date(s.scrobbledAt))
        if (!byDay[key]) byDay[key] = new Set()
        byDay[key].add(s.artist)
      }
      return Object.values(byDay).some((set) => set.size >= 10)
    },
  },
  {
    id: '30_day_streak',
    label: '30-day listening streak',
    check: (scrobbles) => {
      if (scrobbles.length === 0) return false
      const uniqueDates = Array.from(
        new Set(scrobbles.map((s) => toDateString(new Date(s.scrobbledAt))))
      ).sort()
      let run = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1])
        const curr = new Date(uniqueDates[i])
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays === 1) {
          run++
          if (run >= 30) return true
        } else {
          run = 1
        }
      }
      return false
    },
  },
  {
    id: 'genre_explorer',
    label: 'Listened to 20+ different artists',
    check: (scrobbles) => {
      const artists = new Set(scrobbles.map((s) => s.artist))
      return artists.size >= 20
    },
  },
  {
    id: 'free',
    label: 'Free Space',
    check: () => true,
    free: true,
  },
  {
    id: '50_songs_day',
    label: '50+ songs in one day',
    check: (scrobbles) => {
      const byDay: Record<string, number> = {}
      for (const s of scrobbles) {
        const key = toDateString(new Date(s.scrobbledAt))
        byDay[key] = (byDay[key] ?? 0) + 1
      }
      return Object.values(byDay).some((c) => c >= 50)
    },
  },
  {
    id: '1000_total',
    label: '1000+ total scrobbles',
    check: (_, totalScrobbles) => totalScrobbles >= 1000,
  },
  {
    id: 'comeback',
    label: 'Returned to an old favorite',
    check: (scrobbles) => {
      if (scrobbles.length === 0) return false
      const sorted = [...scrobbles].sort(
        (a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime()
      )
      const artistLastSeen: Record<string, Date> = {}
      for (const s of sorted) {
        const d = new Date(s.scrobbledAt)
        if (artistLastSeen[s.artist]) {
          const gapDays =
            (d.getTime() - artistLastSeen[s.artist].getTime()) / (1000 * 60 * 60 * 24)
          if (gapDays >= 30) return true
        }
        artistLastSeen[s.artist] = d
      }
      return false
    },
  },
  {
    id: 'shuffle_day',
    label: 'Played 5+ genres in one day',
    check: (scrobbles) => {
      // Approximate by counting distinct first-word-of-artist combos per day
      // since we don't have genre data; use distinct artists >= 8 as proxy
      const byDay: Record<string, Set<string>> = {}
      for (const s of scrobbles) {
        const key = toDateString(new Date(s.scrobbledAt))
        if (!byDay[key]) byDay[key] = new Set()
        byDay[key].add(s.artist)
      }
      return Object.values(byDay).some((set) => set.size >= 8)
    },
  },
  {
    id: 'monday_blues',
    label: 'Listened on every day of the week',
    check: (scrobbles) => {
      const days = new Set(scrobbles.map((s) => new Date(s.scrobbledAt).getDay()))
      return days.size === 7
    },
  },
  {
    id: 'repeat_day',
    label: 'Replayed an album (same artist, 5+ tracks in a row)',
    check: (scrobbles) => {
      if (scrobbles.length < 5) return false
      const sorted = [...scrobbles].sort(
        (a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime()
      )
      let run = 1
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].artist === sorted[i - 1].artist) {
          run++
          if (run >= 5) return true
        } else {
          run = 1
        }
      }
      return false
    },
  },
  {
    id: 'new_year',
    label: 'Scrobbled on New Year\'s Day',
    check: (scrobbles) =>
      scrobbles.some((s) => {
        const d = new Date(s.scrobbledAt)
        return d.getMonth() === 0 && d.getDate() === 1
      }),
  },
  {
    id: 'binge_artist',
    label: '20+ plays of one artist in a day',
    check: (scrobbles) => {
      const byDayArtist: Record<string, number> = {}
      for (const s of scrobbles) {
        const key = `${toDateString(new Date(s.scrobbledAt))}::${s.artist}`
        byDayArtist[key] = (byDayArtist[key] ?? 0) + 1
      }
      return Object.values(byDayArtist).some((c) => c >= 20)
    },
  },
  {
    id: '100_unique_tracks',
    label: '100+ unique tracks',
    check: (scrobbles) => {
      const tracks = new Set(scrobbles.map((s) => `${s.artist}::${s.track}`))
      return tracks.size >= 100
    },
  },
  {
    id: 'morning_person',
    label: 'Listened 5+ days before 8am',
    check: (scrobbles) => {
      const morningDays = new Set(
        scrobbles
          .filter((s) => new Date(s.scrobbledAt).getHours() < 8)
          .map((s) => toDateString(new Date(s.scrobbledAt)))
      )
      return morningDays.size >= 5
    },
  },
  {
    id: 'party_mode',
    label: 'Party mode (100+ songs in one day)',
    check: (scrobbles) => {
      const byDay: Record<string, number> = {}
      for (const s of scrobbles) {
        const key = toDateString(new Date(s.scrobbledAt))
        byDay[key] = (byDay[key] ?? 0) + 1
      }
      return Object.values(byDay).some((c) => c >= 100)
    },
  },
]

export function ListeningBingo({ scrobbles, totalScrobbles }: ListeningBingoProps) {
  const checked = useMemo(() => {
    return BINGO_SQUARES.map((sq) => sq.check(scrobbles, totalScrobbles))
  }, [scrobbles, totalScrobbles])

  const achievedCount = checked.filter(Boolean).length
  // Free space doesn't count toward the 24
  const achievedNonFree = checked.filter((c, i) => c && !BINGO_SQUARES[i].free).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Listening Bingo</CardTitle>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {achievedNonFree} / 24 achieved
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-1.5">
          {BINGO_SQUARES.map((sq, i) => {
            const isChecked = checked[i]
            return (
              <div
                key={sq.id}
                title={sq.label}
                className={[
                  'relative flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition-colors min-h-[72px]',
                  sq.free
                    ? 'border-primary bg-primary/10'
                    : isChecked
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 opacity-50',
                ].join(' ')}
              >
                {isChecked && (
                  <Check
                    className="absolute top-1 right-1 h-3 w-3 shrink-0"
                    style={{ color: 'var(--primary)' }}
                    strokeWidth={3}
                  />
                )}
                <span
                  className={[
                    'text-[10px] leading-tight font-medium',
                    sq.free
                      ? ''
                      : isChecked
                        ? ''
                        : 'text-muted-foreground',
                  ].join(' ')}
                  style={
                    isChecked || sq.free ? { color: 'var(--primary)' } : undefined
                  }
                >
                  {sq.label}
                </span>
              </div>
            )
          })}
        </div>
        {achievedCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {achievedNonFree >= 5
              ? 'You have a bingo! Keep listening to unlock more.'
              : 'Keep listening to complete your bingo card!'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
