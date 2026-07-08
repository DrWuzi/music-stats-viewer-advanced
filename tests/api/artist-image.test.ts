import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    artistImageCache: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

function makeRequest(name: string): Request {
  return new Request(`http://localhost/api/artist-image?name=${encodeURIComponent(name)}`)
}

describe('GET /api/artist-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('resolves via Last.fm and creates a cache row when no row exists', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        artist: { image: [{ '#text': 'https://lastfm.example/img.jpg', size: 'mega' }] },
      }),
    } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Radiohead'))
    const body = await res.json()

    expect(body.url).toBe('https://lastfm.example/img.jpg')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(prisma.artistImageCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { artistKey: 'radiohead' },
        create: expect.objectContaining({
          artistKey: 'radiohead',
          imageUrl: 'https://lastfm.example/img.jpg',
          source: 'lastfm',
        }),
      }),
    )
  })

  it('returns a cached image without calling any external API', async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'radiohead',
      imageUrl: 'https://cached.example/img.jpg',
      source: 'lastfm',
      resolvedAt: new Date(),
    } as never)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Radiohead'))
    const body = await res.json()

    expect(body.url).toBe('https://cached.example/img.jpg')
    expect(fetch).not.toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).not.toHaveBeenCalled()
  })

  it('retries external sources when a null cache row is older than 10 minutes', async () => {
    const { prisma } = await import('@/lib/prisma')
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'obscure artist',
      imageUrl: null,
      source: null,
      resolvedAt: elevenMinutesAgo,
    } as never)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Obscure Artist'))
    const body = await res.json()

    expect(body.url).toBeNull()
    expect(fetch).toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { artistKey: 'obscure artist' } }),
    )
  })

  it('does not retry external sources when a null cache row is fresh', async () => {
    const { prisma } = await import('@/lib/prisma')
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue({
      id: '1',
      artistKey: 'obscure artist',
      imageUrl: null,
      source: null,
      resolvedAt: oneMinuteAgo,
    } as never)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Obscure Artist'))
    const body = await res.json()

    expect(body.url).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(prisma.artistImageCache.upsert).not.toHaveBeenCalled()
  })

  it("falls back to Deezer and skips Deezer's default placeholder image", async () => {
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.artistImageCache.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.artistImageCache.upsert).mockResolvedValue({} as never)

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ artist: { image: [] } }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { picture_xl: 'https://cdn-images.dzcdn.net/images/artist/d41d8cd98f00b204e9800998ecf8427e/1000x1000-000000-80-0-0.jpg' },
            { picture_xl: 'https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg' },
          ],
        }),
      } as Response)

    const { GET } = await import('@/app/api/artist-image/route')
    const res = await GET(makeRequest('Niche Artist'))
    const body = await res.json()

    expect(body.url).toBe('https://cdn-images.dzcdn.net/images/artist/abc123/1000x1000-000000-80-0-0.jpg')
  })
})
