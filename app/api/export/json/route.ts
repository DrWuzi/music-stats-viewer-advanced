import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''

  const session = await getSession()
  if (!session || session.lastfmUsername !== username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    orderBy: { scrobbledAt: 'desc' },
    select: {
      artist: true,
      album: true,
      track: true,
      scrobbledAt: true,
    },
  })

  const payload = JSON.stringify({
    username,
    exportedAt: new Date(),
    scrobbles: scrobbles.map((s) => ({
      artist: s.artist,
      album: s.album ?? null,
      track: s.track,
      scrobbledAt: s.scrobbledAt.toISOString(),
    })),
  })

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scrobbles-${username}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
