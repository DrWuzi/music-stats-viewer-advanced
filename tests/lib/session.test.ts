import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

describe('getSession', () => {
  it('returns null when no session cookie exists', async () => {
    process.env.NEXTAUTH_SECRET = 'test-secret-that-is-at-least-32-chars-ok'
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    expect(session).toBeNull()
  })
})
