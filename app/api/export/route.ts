import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''
  const format = searchParams.get('format') ?? 'json'

  const session = await getSession()
  if (!session || session.lastfmUsername !== username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    orderBy: { scrobbledAt: 'desc' },
    select: {
      artist: true,
      album: true,
      track: true,
      scrobbledAt: true,
    },
  })

  if (format === 'csv') {
    const rows = scrobbles.map((s) => {
      const timestamp = s.scrobbledAt.toISOString().replace('T', ' ').slice(0, 19)
      return [
        csvEscape(timestamp),
        csvEscape(s.track),
        csvEscape(s.artist),
        csvEscape(s.album ?? ''),
      ].join(',')
    })

    const body = 'Timestamp,Track,Artist,Album\n' + rows.join('\n')

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="scrobbles-${username}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // default: json
  const payload = JSON.stringify({
    username,
    exportedAt: new Date(),
    scrobbles: scrobbles.map((s) => ({
      artist: s.artist,
      album: s.album ?? null,
      track: s.track,
      scrobbledAt: s.scrobbledAt.toISOString(),
    })),
  })

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scrobbles-${username}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
