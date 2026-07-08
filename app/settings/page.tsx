import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      lastfmUsername: true,
      lastSyncedAt: true,
    },
  })

  if (!user) redirect('/login')

  return (
    <SettingsClient
      username={user.lastfmUsername}
      lastSyncedAt={user.lastSyncedAt?.toISOString() ?? null}
    />
  )
}
