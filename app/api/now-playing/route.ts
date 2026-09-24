import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  try {
    const { nowPlaying, recent } = await lastfmClient.getRecentActivity(username, 20)

    return NextResponse.json(
      {
        nowPlaying: nowPlaying !== null,
        track: nowPlaying?.track ?? '',
        artist: nowPlaying?.artist ?? '',
        album: nowPlaying?.album ?? '',
        recent,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { nowPlaying: false, recent: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
