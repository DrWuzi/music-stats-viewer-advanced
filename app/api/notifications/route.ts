import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'
import { prisma } from '@/lib/prisma'

interface Notification {
  id: string
  type: 'friend' | 'chart' | 'milestone' | 'release'
  title: string
  body: string
  href?: string
  timestamp: string
}

const MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function startOfWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const username = searchParams.get('username')
  if (!username) {
    return NextResponse.json({ notifications: [] })
  }

  const notifications: Notification[] = []
  const now = new Date()
  const todayIso = now.toISOString()
  const weekStartIso = startOfWeek().toISOString()

  // 1. Friend activity
  try {
    const friends = await withTimeout(
      lastfmClient.getFriends(username, 8),
      5000,
    )
    const results = await Promise.allSettled(
      friends.map((f) =>
        withTimeout(lastfmClient.getFriendRecentTrack(f.name), 3000).then((t) => ({ friend: f.name, track: t })),
      ),
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.track) {
        const { friend, track } = r.value
        notifications.push({
          id: `friend-${friend}`,
          type: 'friend',
          title: `${friend} is listening`,
          body: `${track.track} by ${track.artist}`,
          href: `/user/${friend}`,
          timestamp: todayIso,
        })
      }
    }
  } catch {
    // Skip friend activity on error
  }

  // 2. Weekly chart
  try {
    const chart = await withTimeout(lastfmClient.getWeeklyArtistChart(username), 5000)
    if (chart.length > 0) {
      notifications.push({
        id: 'weekly-chart-top',
        type: 'chart',
        title: `Your #1 this week`,
        body: chart[0].name,
        href: `/artist/${encodeURIComponent(chart[0].name)}`,
        timestamp: weekStartIso,
      })
    }
  } catch {
    // Skip chart on error
  }

  // 3. Milestones — query DB for scrobble count
  try {
    const user = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true },
    })
    if (user) {
      const scrobbleCount = await prisma.scrobble.count({
        where: { userId: user.id },
      })
      for (const milestone of MILESTONES) {
        const diff = milestone - scrobbleCount
        if (diff >= 0 && diff <= 50) {
          notifications.push({
            id: `milestone-${milestone}`,
            type: 'milestone',
            title: diff === 0 ? `You reached ${milestone.toLocaleString('en-US')} scrobbles!` : `Almost there!`,
            body:
              diff === 0
                ? `Congratulations on hitting ${milestone.toLocaleString('en-US')} scrobbles!`
                : `${diff} scrobbles to go until ${milestone.toLocaleString('en-US')}`,
            href: `/user/${username}`,
            timestamp: todayIso,
          })
          break // Only show the nearest milestone
        }
      }
    }
  } catch {
    // Skip milestones on DB error
  }

  // 4. New releases / discovery nudge
  notifications.push({
    id: 'discover-nudge',
    type: 'release',
    title: 'Based on your taste',
    body: 'Discover new artists you might love',
    href: '/discover',
    timestamp: weekStartIso,
  })

  // Sort: milestones first, then friends, then charts, then releases
  const priority: Record<Notification['type'], number> = {
    milestone: 0,
    friend: 1,
    chart: 2,
    release: 3,
  }
  notifications.sort((a, b) => priority[a.type] - priority[b.type])

  return NextResponse.json({ notifications: notifications.slice(0, 20) })
}
