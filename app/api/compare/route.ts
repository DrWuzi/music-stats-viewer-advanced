import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const user1 = searchParams.get('user1')?.trim()
  const user2 = searchParams.get('user2')?.trim()

  if (!user1 || !user2) {
    return NextResponse.json({ error: 'user1 and user2 are required' }, { status: 400 })
  }

  const [u1, u2] = await Promise.all([
    prisma.user.findUnique({
      where: { lastfmUsername: user1 },
      include: {
        topArtists: { where: { period: 'overall' }, orderBy: { playcount: 'desc' } },
      },
    }),
    prisma.user.findUnique({
      where: { lastfmUsername: user2 },
      include: {
        topArtists: { where: { period: 'overall' }, orderBy: { playcount: 'desc' } },
      },
    }),
  ])

  if (!u1) {
    return NextResponse.json({ error: 'User not found', missing: user1 }, { status: 404 })
  }
  if (!u2) {
    return NextResponse.json({ error: 'User not found', missing: user2 }, { status: 404 })
  }

  const mapA = new Map(u1.topArtists.map((a) => [a.name.toLowerCase(), a]))
  const mapB = new Map(u2.topArtists.map((a) => [a.name.toLowerCase(), a]))

  const sharedKeys = [...mapA.keys()].filter((k) => mapB.has(k))

  const compatibilityScore =
    Math.max(u1.topArtists.length, u2.topArtists.length) > 0
      ? Math.round((sharedKeys.length / Math.max(u1.topArtists.length, u2.topArtists.length)) * 100)
      : 0

  const uniqueToUser1 = u1.topArtists
    .filter((a) => !mapB.has(a.name.toLowerCase()))
    .slice(0, 10)
    .map((a) => ({ name: a.name, playcount: a.playcount }))

  const uniqueToUser2 = u2.topArtists
    .filter((a) => !mapA.has(a.name.toLowerCase()))
    .slice(0, 10)
    .map((a) => ({ name: a.name, playcount: a.playcount }))

  const topShared = sharedKeys
    .map((key) => {
      const a1 = mapA.get(key)!
      const a2 = mapB.get(key)!
      return {
        name: a1.name,
        playcount1: a1.playcount,
        playcount2: a2.playcount,
        total: a1.playcount + a2.playcount,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return NextResponse.json({
    sharedArtists: sharedKeys.length,
    compatibilityScore,
    uniqueToUser1,
    uniqueToUser2,
    topShared,
  })
}
