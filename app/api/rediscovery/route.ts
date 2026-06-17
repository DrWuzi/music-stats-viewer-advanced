import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GAP_THRESHOLD_DAYS = 90
const RECENT_DAYS = 60

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ rediscoveries: [] })
  }

  // Fetch all scrobbles with artist and date, ordered ascending
  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { artist: true, scrobbledAt: true },
    orderBy: { scrobbledAt: 'asc' },
  })

  if (scrobbles.length === 0) {
    return NextResponse.json({ rediscoveries: [] })
  }

  // Group dates by artist
  const artistDates = new Map<string, Date[]>()
  for (const s of scrobbles) {
    const existing = artistDates.get(s.artist)
    if (existing) {
      existing.push(s.scrobbledAt)
    } else {
      artistDates.set(s.artist, [s.scrobbledAt])
    }
  }

  const recentCutoff = new Date(Date.now() - RECENT_DAYS * 86400000)
  const gapThresholdMs = GAP_THRESHOLD_DAYS * 86400000

  const rediscoveries: { artist: string; gapDays: number; lastHeard: string }[] = []

  for (const [artist, dates] of artistDates) {
    if (dates.length < 2) continue

    // dates are already sorted asc from the query
    const lastScrobble = dates[dates.length - 1]

    // Only include artists scrobbled within the last 60 days
    if (lastScrobble < recentCutoff) continue

    // Find the maximum gap between consecutive dates
    let maxGapMs = 0
    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime()
      if (diff > maxGapMs) {
        maxGapMs = diff
      }
    }

    if (maxGapMs >= gapThresholdMs) {
      rediscoveries.push({
        artist,
        gapDays: Math.floor(maxGapMs / 86400000),
        lastHeard: lastScrobble.toISOString(),
      })
    }
  }

  // Sort by gap days descending, take top 10
  rediscoveries.sort((a, b) => b.gapDays - a.gapDays)
  const top10 = rediscoveries.slice(0, 10)

  return NextResponse.json({ rediscoveries: top10 })
}
