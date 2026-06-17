import { NextRequest, NextResponse } from 'next/server'
import { lastfmClient } from '@/lib/lastfm'
import { prisma } from '@/lib/prisma'
import { createSession, sessionCookieOptions } from '@/lib/session'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=missing_token', request.url))

  try {
    const { name, key } = await lastfmClient.getSession(token)
    const user = await prisma.user.upsert({
      where: { lastfmUsername: name },
      update: { sessionKey: key },
      create: { lastfmUsername: name, sessionKey: key },
    })

    const jwt = await createSession({ userId: user.id, lastfmUsername: name })
    const { name: cookieName, ...opts } = sessionCookieOptions()

    const res = NextResponse.redirect(new URL('/dashboard', request.url))
    res.cookies.set(cookieName, jwt, opts)
    return res
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}
