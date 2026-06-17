import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  const daysParam = req.nextUrl.searchParams.get('days')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const days = daysParam ? parseInt(daysParam, 10) : 30
  if (isNaN(days) || days <= 0) {
    return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ discoveries: [] })
  }

  const since = new Date(Date.now() - days * 86400000)

  const grouped = await prisma.scrobble.groupBy({
    by: ['artist'],
    where: { userId: user.id },
    _min: { scrobbledAt: true },
    _count: { _all: true },
  })

  const discoveries = grouped
    .filter((g) => g._min.scrobbledAt !== null && g._min.scrobbledAt >= since)
    .sort((a, b) => {
      const aTime = a._min.scrobbledAt!.getTime()
      const bTime = b._min.scrobbledAt!.getTime()
      return bTime - aTime
    })
    .slice(0, 20)
    .map((g) => ({
      artist: g.artist,
      firstHeard: g._min.scrobbledAt!.toISOString(),
      playcount: g._count._all,
    }))

  return NextResponse.json({ discoveries })
}
