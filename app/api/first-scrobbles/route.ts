import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  const limitParam = req.nextUrl.searchParams.get('limit')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 200) : 50

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ discoveries: [] })
  }

  const grouped = await prisma.scrobble.groupBy({
    by: ['artist'],
    where: { userId: user.id },
    _min: { scrobbledAt: true },
    _count: { _all: true },
  })

  const discoveries = grouped
    .filter((g) => g._min.scrobbledAt !== null)
    .sort((a, b) => a._min.scrobbledAt!.getTime() - b._min.scrobbledAt!.getTime())
    .slice(0, limit)
    .map((g) => ({
      artist: g.artist,
      firstHeard: g._min.scrobbledAt!.toISOString(),
      totalPlays: g._count._all,
    }))

  return NextResponse.json({ discoveries })
}
