import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = { matcher: ['/dashboard/:path*'] }
