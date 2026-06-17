import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('exports a prisma client instance', async () => {
    const { prisma } = await import('@/lib/prisma')
    expect(prisma).toBeDefined()
    expect(typeof prisma.user.findMany).toBe('function')
  })
})
