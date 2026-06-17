import { NextResponse } from 'next/server'
import { sessionCookieOptions } from '@/lib/session'

export async function POST(request: Request) {
  const { name: cookieName, ...opts } = sessionCookieOptions()
  const res = NextResponse.redirect(new URL('/', new URL(request.url).origin))
  res.cookies.set(cookieName, '', { ...opts, maxAge: 0 })
  return res
}
