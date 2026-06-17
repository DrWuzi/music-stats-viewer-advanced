import { NextResponse } from 'next/server'

export async function GET() {
  const cb = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/auth/lastfm/callback`)
  return NextResponse.redirect(
    `https://www.last.fm/api/auth/?api_key=${process.env.LASTFM_API_KEY}&cb=${cb}`,
  )
}
