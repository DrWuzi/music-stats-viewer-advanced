import { prisma } from '../lib/prisma'
import { syncUser } from '../lib/sync'

const INTERVAL_MS = 10 * 60 * 1000
const USER_DELAY_MS = 300

async function runCycle() {
  console.log(`[worker] Sync cycle started at ${new Date().toISOString()}`)
  // Sync authenticated users every cycle; sync public stubs only if not synced in last 6 hours
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { sessionKey: { not: '' } },
        { lastSyncedAt: { lt: sixHoursAgo } },
        { lastSyncedAt: null },
      ],
    },
    select: { lastfmUsername: true },
  })
  console.log(`[worker] Syncing ${users.length} users`)

  for (const user of users) {
    try {
      await syncUser(user.lastfmUsername)
      console.log(`[worker] ✓ ${user.lastfmUsername}`)
    } catch (err) {
      console.error(`[worker] ✗ ${user.lastfmUsername}:`, err)
    }
    await new Promise((r) => setTimeout(r, USER_DELAY_MS))
  }

  console.log('[worker] Cycle complete')
}

async function main() {
  console.log('[worker] Last.fm sync worker started')
  await runCycle()
  setInterval(runCycle, INTERVAL_MS)
}

main().catch((err) => {
  console.error('[worker] Fatal:', err)
  process.exit(1)
})
