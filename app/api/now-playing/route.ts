import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }

  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
    `&user=${encodeURIComponent(username)}&limit=1&api_key=${apiKey}&format=json`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json(
        { nowPlaying: false },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const data = await res.json()
    const track = data?.recenttracks?.track?.[0]

    if (!track) {
      return NextResponse.json(
        { nowPlaying: false },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const isNowPlaying = track['@attr']?.nowplaying === 'true'

    if (!isNowPlaying) {
      return NextResponse.json(
        { nowPlaying: false },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        nowPlaying: true,
        track: track.name ?? '',
        artist: track.artist?.['#text'] ?? '',
        album: track.album?.['#text'] ?? '',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { nowPlaying: false },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
