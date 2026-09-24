import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('lastfmClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.LASTFM_API_KEY = 'test_key'
    process.env.LASTFM_API_SECRET = 'test_secret'
  })

  it('getRecentTracks returns parsed tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Song',
              artist: { '#text': 'Artist' },
              album: { '#text': 'Album' },
              date: { uts: '1700000000' },
            },
          ],
          '@attr': { total: '1' },
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const tracks = await lastfmClient.getRecentTracks('testuser')
    expect(tracks).toHaveLength(1)
    expect(tracks[0].name).toBe('Song')
    expect(tracks[0].artist).toBe('Artist')
  })

  it('getTopArtists returns parsed artists', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topartists: {
          artist: [{ name: 'Artist', playcount: '100', '@attr': { rank: '1' } }],
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const artists = await lastfmClient.getTopArtists('testuser', '7day')
    expect(artists[0].name).toBe('Artist')
    expect(artists[0].playcount).toBe(100)
    expect(artists[0].rank).toBe(1)
  })

  it('getRecentActivity separates the now-playing track from completed scrobbles', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Live Track',
              artist: { '#text': 'Live Artist' },
              album: { '#text': 'Live Album' },
              '@attr': { nowplaying: 'true' },
            },
            {
              name: 'Past Track',
              artist: { '#text': 'Past Artist' },
              album: { '#text': 'Past Album' },
              date: { uts: '1700000000' },
            },
          ],
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const { nowPlaying, recent } = await lastfmClient.getRecentActivity('testuser')

    expect(nowPlaying).toEqual({ track: 'Live Track', artist: 'Live Artist', album: 'Live Album' })
    expect(recent).toHaveLength(1)
    expect(recent[0].track).toBe('Past Track')
  })

  it('getRecentActivity returns no now-playing when nothing is currently playing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recenttracks: {
          track: [
            {
              name: 'Past Track',
              artist: { '#text': 'Past Artist' },
              album: { '#text': 'Past Album' },
              date: { uts: '1700000000' },
            },
          ],
        },
      }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    const { nowPlaying, recent } = await lastfmClient.getRecentActivity('testuser')

    expect(nowPlaying).toBeNull()
    expect(recent).toHaveLength(1)
  })

  it('throws on Last.fm error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 6, message: 'User not found' }),
    } as Response)

    const { lastfmClient } = await import('@/lib/lastfm')
    await expect(lastfmClient.getRecentTracks('nobody')).rejects.toThrow('User not found')
  })
})
