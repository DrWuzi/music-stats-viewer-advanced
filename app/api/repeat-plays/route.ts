import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  const minParam = req.nextUrl.searchParams.get('min')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const min = minParam ? parseInt(minParam, 10) : 10
  if (isNaN(min) || min <= 0) {
    return NextResponse.json({ error: 'Invalid min parameter' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ tracks: [] })
  }

  const grouped = await prisma.scrobble.groupBy({
    by: ['track', 'artist'],
    where: { userId: user.id },
    _count: { _all: true },
    orderBy: { _count: { track: 'desc' } },
  })

  const tracks = grouped
    .filter((g) => g._count._all >= min)
    .slice(0, 50)
    .map((g) => ({
      track: g.track,
      artist: g.artist,
      count: g._count._all,
    }))

  return NextResponse.json({ tracks })
}
