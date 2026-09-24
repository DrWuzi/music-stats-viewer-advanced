import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''
  const limit = Number(searchParams.get('limit') ?? '50')

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  try {
    const tags = await lastfmClient.getTopTags(username, limit)
    return NextResponse.json({ tags })
  } catch {
    return NextResponse.json({ tags: [] })
  }
}
