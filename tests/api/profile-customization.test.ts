import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: vi.fn() },
  },
}))

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/profile-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/profile-customization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'aurora' }))
    expect(res.status).toBe(401)
  })

  it('ignores an invalid profileBackground value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'not-a-real-pattern' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profileBackground).toBeUndefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ profileBackground: expect.anything() }),
      }),
    )
  })

  it('persists a valid profileBackground value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'aurora' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profileBackground).toBe('aurora')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lastfmUsername: 'user' },
        data: expect.objectContaining({ profileBackground: 'aurora' }),
      }),
    )
  })

  it('ignores an invalid loadingAnimation value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ loadingAnimation: 'not-a-real-preset' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.loadingAnimation).toBeUndefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ loadingAnimation: expect.anything() }),
      }),
    )
  })

  it('persists a valid loadingAnimation value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ loadingAnimation: 'vinyl' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.loadingAnimation).toBe('vinyl')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lastfmUsername: 'user' },
        data: expect.objectContaining({ loadingAnimation: 'vinyl' }),
      }),
    )
  })
})
