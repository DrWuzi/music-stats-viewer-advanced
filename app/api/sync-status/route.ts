import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const scrobbleCount = await prisma.scrobble.count({
    where: { userId: user.id },
  })

  return NextResponse.json({
    synced: user.lastSyncedAt !== null,
    lastSyncedAt: user.lastSyncedAt ? user.lastSyncedAt.toISOString() : null,
    scrobbleCount,
  })
}
