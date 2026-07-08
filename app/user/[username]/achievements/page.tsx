import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { SortControl } from '@/components/sort-control'
import {
  Star,
  Award,
  Trophy,
  Crown,
  Sparkles,
  Moon,
  Flame,
  Zap,
  Music2,
  Heart,
  Lock,
  Headphones,
  Globe,
  Clock,
  Calendar,
  Repeat2,
  Shuffle,
  Radio,
  Mic2,
  LibraryBig,
  TrendingUp,
} from 'lucide-react'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s Achievements — Last.fm Advanced` }
}

type AchievementSort = 'unlocked_desc' | 'name_az'

const SORT_OPTIONS: { value: AchievementSort; label: string }[] = [
  { value: 'unlocked_desc', label: 'Recently unlocked' },
  { value: 'name_az', label: 'Name A–Z' },
]

const VALID_SORTS = new Set<AchievementSort>(['unlocked_desc', 'name_az'])

// --- Achievement definitions ---

type AchievementResult = {
  id: string
  label: string
  desc: string
  icon: React.ReactNode
  earned: boolean
  progress?: number // 0-100
  progressLabel?: string
}

const ICON_CLASS_EARNED = 'w-7 h-7'
const ICON_CLASS_LOCKED = 'w-7 h-7 opacity-40'

function buildAchievements(data: {
  totalScrobbles: number
  artistCounts: Record<string, number>
  hourCounts: number[]
  daySet: Set<string>
  uniqueArtists: number
  uniqueTracks: number
  uniqueAlbums: number
  lovedCount: number
  weekdayCounts: number[]
  totalFromDB: number
  topTrackCount: number
}): AchievementResult[] {
  const {
    totalScrobbles,
    artistCounts,
    hourCounts,
    daySet,
    uniqueArtists,
    uniqueTracks,
    uniqueAlbums,
    lovedCount,
    weekdayCounts,
    totalFromDB,
    topTrackCount,
  } = data

  // Midnight–5am scrobble count
  const lateNightCount = hourCounts.slice(0, 5).reduce((a, b) => a + b, 0)
  const nightOwlPct = totalScrobbles > 0 ? lateNightCount / totalScrobbles : 0

  // Streak calculation
  const sortedDays = Array.from(daySet).sort()
  let longestStreak = 0
  let currentStreak = 0
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak
  }

  // Top artist play count
  const topArtistCount = Math.max(0, ...Object.values(artistCounts))

  // Weekend scrobbles (Sat=6, Sun=0)
  const weekendCount = (weekdayCounts[0] ?? 0) + (weekdayCounts[6] ?? 0)
  const weekendPct = totalScrobbles > 0 ? weekendCount / totalScrobbles : 0

  // Morning person: 6–9am
  const morningCount = hourCounts.slice(6, 10).reduce((a, b) => a + b, 0)
  const morningPct = totalScrobbles > 0 ? morningCount / totalScrobbles : 0

  function scrobbleProgress(count: number, target: number) {
    return Math.min(100, Math.floor((count / target) * 100))
  }

  const achievements: AchievementResult[] = [
    // --- Scrobble milestones ---
    {
      id: 'rookie',
      label: 'Rookie',
      desc: '100+ scrobbles',
      icon: <Star className={totalFromDB >= 100 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 100,
      progress: scrobbleProgress(totalFromDB, 100),
      progressLabel: `${totalFromDB.toLocaleString()} / 100`,
    },
    {
      id: 'dedicated',
      label: 'Dedicated',
      desc: '1,000+ scrobbles',
      icon: <Award className={totalFromDB >= 1000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 1000,
      progress: scrobbleProgress(totalFromDB, 1000),
      progressLabel: `${totalFromDB.toLocaleString()} / 1,000`,
    },
    {
      id: 'enthusiast',
      label: 'Enthusiast',
      desc: '10,000+ scrobbles',
      icon: <Trophy className={totalFromDB >= 10000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 10000,
      progress: scrobbleProgress(totalFromDB, 10000),
      progressLabel: `${totalFromDB.toLocaleString()} / 10,000`,
    },
    {
      id: 'hardcore',
      label: 'Hardcore',
      desc: '50,000+ scrobbles',
      icon: <Crown className={totalFromDB >= 50000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 50000,
      progress: scrobbleProgress(totalFromDB, 50000),
      progressLabel: `${totalFromDB.toLocaleString()} / 50,000`,
    },
    {
      id: 'legend',
      label: 'Legend',
      desc: '100,000+ scrobbles',
      icon: <Sparkles className={totalFromDB >= 100000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 100000,
      progress: scrobbleProgress(totalFromDB, 100000),
      progressLabel: `${totalFromDB.toLocaleString()} / 100,000`,
    },
    // --- Listening habits ---
    {
      id: 'night_owl',
      label: 'Night Owl',
      desc: '30%+ of scrobbles between midnight and 5am',
      icon: <Moon className={nightOwlPct >= 0.3 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: nightOwlPct >= 0.3,
      progress: Math.min(100, Math.floor((nightOwlPct / 0.3) * 100)),
      progressLabel: `${Math.round(nightOwlPct * 100)}% / 30%`,
    },
    {
      id: 'morning_person',
      label: 'Morning Person',
      desc: '20%+ of scrobbles between 6am and 10am',
      icon: <Clock className={morningPct >= 0.2 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: morningPct >= 0.2,
      progress: Math.min(100, Math.floor((morningPct / 0.2) * 100)),
      progressLabel: `${Math.round(morningPct * 100)}% / 20%`,
    },
    {
      id: 'weekend_warrior',
      label: 'Weekend Warrior',
      desc: '40%+ of scrobbles on weekends',
      icon: <Calendar className={weekendPct >= 0.4 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: weekendPct >= 0.4,
      progress: Math.min(100, Math.floor((weekendPct / 0.4) * 100)),
      progressLabel: `${Math.round(weekendPct * 100)}% / 40%`,
    },
    // --- Streaks ---
    {
      id: 'streak_7',
      label: 'Week Streak',
      desc: '7 days in a row with at least one scrobble',
      icon: <Flame className={longestStreak >= 7 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: longestStreak >= 7,
      progress: Math.min(100, Math.floor((longestStreak / 7) * 100)),
      progressLabel: `${longestStreak} / 7 days`,
    },
    {
      id: 'streak_30',
      label: 'Month Streak',
      desc: '30 days in a row with at least one scrobble',
      icon: <Zap className={longestStreak >= 30 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: longestStreak >= 30,
      progress: Math.min(100, Math.floor((longestStreak / 30) * 100)),
      progressLabel: `${longestStreak} / 30 days`,
    },
    // --- Artist obsession ---
    {
      id: 'centurion',
      label: 'Centurion',
      desc: 'One artist with 100+ plays',
      icon: <Music2 className={topArtistCount >= 100 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: topArtistCount >= 100,
      progress: Math.min(100, Math.floor((topArtistCount / 100) * 100)),
      progressLabel: `${topArtistCount.toLocaleString()} / 100 plays`,
    },
    {
      id: 'obsessed',
      label: 'Obsessed',
      desc: 'One artist with 1,000+ plays',
      icon: <Heart className={topArtistCount >= 1000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: topArtistCount >= 1000,
      progress: Math.min(100, Math.floor((topArtistCount / 1000) * 100)),
      progressLabel: `${topArtistCount.toLocaleString()} / 1,000 plays`,
    },
    // --- Discovery & variety ---
    {
      id: 'globetrotter',
      label: 'Globetrotter',
      desc: '50+ unique artists discovered',
      icon: <Globe className={uniqueArtists >= 50 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: uniqueArtists >= 50,
      progress: Math.min(100, Math.floor((uniqueArtists / 50) * 100)),
      progressLabel: `${uniqueArtists.toLocaleString()} / 50 artists`,
    },
    {
      id: 'explorer',
      label: 'Explorer',
      desc: '500+ unique artists discovered',
      icon: <Headphones className={uniqueArtists >= 500 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: uniqueArtists >= 500,
      progress: Math.min(100, Math.floor((uniqueArtists / 500) * 100)),
      progressLabel: `${uniqueArtists.toLocaleString()} / 500 artists`,
    },
    {
      id: 'eclectic',
      label: 'Eclectic',
      desc: '1,000+ unique tracks played',
      icon: <Shuffle className={uniqueTracks >= 1000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: uniqueTracks >= 1000,
      progress: Math.min(100, Math.floor((uniqueTracks / 1000) * 100)),
      progressLabel: `${uniqueTracks.toLocaleString()} / 1,000 tracks`,
    },
    {
      id: 'librarian',
      label: 'Librarian',
      desc: '200+ unique albums in your collection',
      icon: <LibraryBig className={uniqueAlbums >= 200 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: uniqueAlbums >= 200,
      progress: Math.min(100, Math.floor((uniqueAlbums / 200) * 100)),
      progressLabel: `${uniqueAlbums.toLocaleString()} / 200 albums`,
    },
    // --- Loved tracks ---
    {
      id: 'curator',
      label: 'Curator',
      desc: '50+ loved tracks',
      icon: <Radio className={lovedCount >= 50 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: lovedCount >= 50,
      progress: Math.min(100, Math.floor((lovedCount / 50) * 100)),
      progressLabel: `${lovedCount.toLocaleString()} / 50 loved`,
    },
    // --- Repeat listener ---
    {
      id: 'on_repeat',
      label: 'On Repeat',
      desc: 'One track played 50+ times',
      icon: <Repeat2 className={topTrackCount >= 50 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: topTrackCount >= 50,
      progress: Math.min(100, Math.floor((topTrackCount / 50) * 100)),
      progressLabel: `${topTrackCount.toLocaleString()} / 50 plays`,
    },
    // --- Artist collector ---
    {
      id: 'scene_kid',
      label: 'Scene Kid',
      desc: 'Top artist has 500+ plays',
      icon: <Mic2 className={topArtistCount >= 500 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: topArtistCount >= 500,
      progress: Math.min(100, Math.floor((topArtistCount / 500) * 100)),
      progressLabel: `${topArtistCount.toLocaleString()} / 500 plays`,
    },
    // --- Growth ---
    {
      id: 'rising',
      label: 'Rising',
      desc: '5,000+ scrobbles milestone',
      icon: <TrendingUp className={totalFromDB >= 5000 ? ICON_CLASS_EARNED : ICON_CLASS_LOCKED} />,
      earned: totalFromDB >= 5000,
      progress: scrobbleProgress(totalFromDB, 5000),
      progressLabel: `${totalFromDB.toLocaleString()} / 5,000`,
    },
  ]

  return achievements
}

export default async function AchievementsPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams
  const sort: AchievementSort = VALID_SORTS.has(sp?.sort as AchievementSort)
    ? (sp!.sort as AchievementSort)
    : 'unlocked_desc'

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) notFound()

  const totalFromDB = await prisma.scrobble.count({ where: { userId: user.id } })

  // Fetch all scrobbles for special achievement computation
  // Use select to minimize data transfer
  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { scrobbledAt: true, artist: true, track: true, album: true },
  })

  const lovedCount = await prisma.lovedTrack.count({ where: { userId: user.id } })

  // Compute metrics
  const artistCounts: Record<string, number> = {}
  const trackCounts: Record<string, number> = {}
  const albumSet = new Set<string>()
  const trackSet = new Set<string>()
  const daySet = new Set<string>()
  const hourCounts = new Array<number>(24).fill(0)
  const weekdayCounts = new Array<number>(7).fill(0)

  for (const s of scrobbles) {
    artistCounts[s.artist] = (artistCounts[s.artist] ?? 0) + 1

    const trackKey = `${s.track}|||${s.artist}`
    trackCounts[trackKey] = (trackCounts[trackKey] ?? 0) + 1
    trackSet.add(trackKey)

    if (s.album) albumSet.add(`${s.album}|||${s.artist}`)

    const d = new Date(s.scrobbledAt)
    daySet.add(d.toISOString().slice(0, 10))
    hourCounts[d.getHours()]++
    weekdayCounts[d.getDay()]++
  }

  const topTrackCount = Math.max(0, ...Object.values(trackCounts))
  const uniqueArtists = Object.keys(artistCounts).length
  const uniqueTracks = trackSet.size
  const uniqueAlbums = albumSet.size

  const achievements = buildAchievements({
    totalScrobbles: scrobbles.length,
    artistCounts,
    hourCounts,
    daySet,
    uniqueArtists,
    uniqueTracks,
    uniqueAlbums,
    lovedCount,
    weekdayCounts,
    totalFromDB,
    topTrackCount,
  })

  const earnedBase = achievements.filter((a) => a.earned)
  const lockedBase = achievements.filter((a) => !a.earned)

  // Find "next" badge for progress display (highest progress locked badge),
  // independent of the user's chosen display sort order.
  const nextBadge = [...lockedBase].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]

  // 'unlocked_desc' has no per-badge unlock timestamp to sort by, so it
  // preserves the natural (most-significant-first) definition order as the
  // default view. 'name_az' sorts both lists alphabetically.
  const earned =
    sort === 'name_az'
      ? [...earnedBase].sort((a, b) => a.label.localeCompare(b.label))
      : earnedBase
  const locked =
    sort === 'name_az'
      ? [...lockedBase].sort((a, b) => a.label.localeCompare(b.label))
      : [...lockedBase].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href={`/user/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block transition-colors"
          >
            ← Back to profile
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">{username}&apos;s Achievements</h1>
              <p className="text-muted-foreground mt-1">
                {earned.length} of {achievements.length} achievements unlocked
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <SortControl options={SORT_OPTIONS} defaultValue="unlocked_desc" />
            </div>
          </div>
        </div>

        {/* Progress summary bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Overall progress</span>
            <span>{Math.round((earned.length / achievements.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((earned.length / achievements.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Earned ({earned.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {earned.map((a) => (
                <Card
                  key={a.id}
                  className="border-2 transition-shadow"
                  style={{
                    borderColor: 'color-mix(in oklch, var(--primary) 60%, transparent)',
                    boxShadow: '0 0 16px color-mix(in oklch, var(--primary) 30%, transparent)',
                  }}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div
                      className="rounded-full p-3"
                      style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)' }}
                    >
                      <span style={{ color: 'var(--primary)' }}>{a.icon}</span>
                    </div>
                    <p className="font-semibold text-sm leading-tight">{a.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{a.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Locked badges */}
        {locked.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Locked ({locked.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {locked.map((a) => (
                <Card key={a.id} className="border opacity-70">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className="relative rounded-full p-3 bg-muted">
                        <span className="grayscale">{a.icon}</span>
                        <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-sm leading-tight text-muted-foreground">
                        {a.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">{a.desc}</p>
                      {a.progress !== undefined && (
                        <div className="w-full space-y-1 mt-1">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-muted-foreground transition-all"
                              style={{ width: `${a.progress}%` }}
                            />
                          </div>
                          {a.progressLabel && (
                            <p className="text-xs text-muted-foreground">{a.progressLabel}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* Next achievement callout */}
        {nextBadge && (
          <Card
            className="border"
            style={{ borderColor: 'color-mix(in oklch, var(--primary) 40%, transparent)' }}
          >
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="rounded-full p-3 shrink-0"
                style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }}
              >
                <span style={{ color: 'var(--primary)', opacity: 0.7 }}>{nextBadge.icon}</span>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <p className="font-semibold">
                  Closest to unlock:{' '}
                  <span style={{ color: 'var(--primary)' }}>{nextBadge.label}</span>
                </p>
                <p className="text-sm text-muted-foreground">{nextBadge.desc}</p>
                {nextBadge.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${nextBadge.progress}%` }}
                      />
                    </div>
                    {nextBadge.progressLabel && (
                      <p className="text-xs text-muted-foreground">{nextBadge.progressLabel}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
