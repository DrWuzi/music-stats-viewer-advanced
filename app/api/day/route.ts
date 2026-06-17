import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  const date = req.nextUrl.searchParams.get('date') // YYYY-MM-DD

  if (!username || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username }, select: { id: true } })
  if (!user) return NextResponse.json({ tracks: [] })

  const dayStart = new Date(`${date}T00:00:00.000Z`)
  const dayEnd = new Date(`${date}T23:59:59.999Z`)

  const tracks = await prisma.scrobble.findMany({
    where: { userId: user.id, scrobbledAt: { gte: dayStart, lte: dayEnd } },
    orderBy: { scrobbledAt: 'desc' },
    select: { artist: true, album: true, track: true, scrobbledAt: true },
  })

  return NextResponse.json({ tracks })
}
