import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const search = searchParams.get('search') ?? ''

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const where: Prisma.ScrobbleWhereInput = { userId: user.id }

  if (search.trim()) {
    where.OR = [
      { artist: { contains: search, mode: 'insensitive' } },
      { track: { contains: search, mode: 'insensitive' } },
    ]
  }

  const skip = (page - 1) * limit

  const [tracks, total] = await Promise.all([
    prisma.scrobble.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scrobbledAt: 'desc' },
      select: {
        artist: true,
        track: true,
        album: true,
        scrobbledAt: true,
      },
    }),
    prisma.scrobble.count({ where }),
  ])

  return NextResponse.json({
    tracks,
    total,
    page,
    hasMore: page * limit < total,
  })
}
