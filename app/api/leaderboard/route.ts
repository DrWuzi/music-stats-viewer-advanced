import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 200) : 50

  const users = await prisma.user.findMany({
    where: { lastSyncedAt: { not: null } },
    select: { lastfmUsername: true, _count: { select: { scrobbles: true } } },
    orderBy: { scrobbles: { _count: 'desc' } },
    take: limit,
  })

  const result = users.map((u, i) => ({
    lastfmUsername: u.lastfmUsername,
    scrobbleCount: u._count.scrobbles,
    rank: i + 1,
  }))

  return NextResponse.json({ users: result })
}
