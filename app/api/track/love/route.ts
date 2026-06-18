import { createHash } from 'crypto'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function signParams(params: Record<string, string>): string {
  const keys = Object.keys(params)
    .filter((k) => k !== 'format')
    .sort()
  const str = keys.map((k) => k + params[k]).join('') + process.env.LASTFM_API_SECRET
  return createHash('md5').update(str).digest('hex')
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { artist, track, unlove } = await req.json()
  if (!artist || !track) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user?.sessionKey) {
    return Response.json({ error: 'No Last.fm session key found' }, { status: 403 })
  }

  const method = unlove ? 'track.unlove' : 'track.love'
  const params: Record<string, string> = {
    method,
    artist,
    track,
    api_key: process.env.LASTFM_API_KEY!,
    sk: user.sessionKey,
  }
  params.api_sig = signParams(params)

  const body = new URLSearchParams({ ...params, format: 'json' })
  const res = await fetch('https://ws.audioscrobbler.com/2.0/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()
  if (data.error) {
    return Response.json({ error: data.message ?? `Last.fm error ${data.error}` }, { status: 502 })
  }

  return Response.json({ success: true })
}
