import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const usernameParam = searchParams.get('username')

  const targetUsername = usernameParam ?? session.lastfmUsername

  if (usernameParam && usernameParam !== session.lastfmUsername) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.user.update({
    where: { lastfmUsername: targetUsername },
    data: { lastSyncedAt: null },
  })

  return NextResponse.json({
    ok: true,
    message: 'Sync reset. Visit your dashboard to trigger a full resync.',
  })
}
