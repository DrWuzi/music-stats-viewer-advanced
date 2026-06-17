import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/sync', () => ({ syncUser: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

describe('POST /api/sync', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 429 when synced less than 5 minutes ago', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      lastfmUsername: 'user',
      sessionKey: 'key',
      lastSyncedAt: null,
      lastManualSyncAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(429)
  })

  it('returns 200 with lastSyncedAt when allowed', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    const now = new Date()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', lastfmUsername: 'user', sessionKey: 'key',
      lastSyncedAt: null, lastManualSyncAt: null, createdAt: new Date(),
    })
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'u1', lastfmUsername: 'user', sessionKey: 'key',
      lastSyncedAt: now, lastManualSyncAt: now, createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/sync/route')
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('lastSyncedAt')
  })
})
