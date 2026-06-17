import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    scrobble: { createMany: vi.fn() },
    topArtist: { deleteMany: vi.fn(), createMany: vi.fn() },
    topAlbum: { deleteMany: vi.fn(), createMany: vi.fn() },
    topTrack: { deleteMany: vi.fn(), createMany: vi.fn() },
    lovedTrack: { findMany: vi.fn(), createMany: vi.fn() },
  },
}))

vi.mock('@/lib/lastfm', () => ({
  lastfmClient: {
    getRecentTracks: vi.fn().mockResolvedValue([
      { name: 'Song', artist: 'Artist', album: 'Album', scrobbledAt: new Date('2024-01-01'), nowPlaying: false },
    ]),
    getTopArtists: vi.fn().mockResolvedValue([]),
    getTopAlbums: vi.fn().mockResolvedValue([]),
    getTopTracks: vi.fn().mockResolvedValue([]),
    getLovedTracks: vi.fn().mockResolvedValue([]),
  },
  PERIODS: ['7day', '1month', '3month', '6month', '12month', 'overall'],
}))

describe('syncUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates scrobbles for a user', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user1',
      lastfmUsername: 'testuser',
      sessionKey: 'key',
      lastSyncedAt: null,
      lastManualSyncAt: null,
      createdAt: new Date(),
    })
    vi.mocked(prisma.scrobble.createMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.lovedTrack.findMany).mockResolvedValue([])
    vi.mocked(prisma.lovedTrack.createMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { syncUser } = await import('@/lib/sync')
    await syncUser('testuser')

    expect(prisma.scrobble.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ track: 'Song', artist: 'Artist' }),
        ]),
      }),
    )
  })

  it('throws when user not found in DB', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const { syncUser } = await import('@/lib/sync')
    await expect(syncUser('nobody')).rejects.toThrow('User nobody not found')
  })
})
