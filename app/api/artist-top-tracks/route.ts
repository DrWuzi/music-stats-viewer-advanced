import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get('artist') ?? ''
  const limit = Number(searchParams.get('limit') ?? '50')

  if (!artist) {
    return NextResponse.json({ error: 'artist required' }, { status: 400 })
  }

  try {
    const tracks = await lastfmClient.getArtistTopTracks(artist, limit)
    return NextResponse.json({ tracks })
  } catch {
    return NextResponse.json({ tracks: [] })
  }
}
