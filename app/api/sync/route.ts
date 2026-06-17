import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { syncUser } from '@/lib/sync'
import { prisma } from '@/lib/prisma'

const COOLDOWN_MS = 5 * 60 * 1000

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.lastManualSyncAt) {
    const elapsed = Date.now() - user.lastManualSyncAt.getTime()
    if (elapsed < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }
  }

  await syncUser(user.lastfmUsername)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastManualSyncAt: new Date() },
  })

  return NextResponse.json({ lastSyncedAt: updated.lastSyncedAt })
}
