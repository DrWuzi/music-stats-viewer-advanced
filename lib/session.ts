import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface Session {
  userId: string
  lastfmUsername: string
}

const COOKIE = 'session'
const DAYS = 30

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function createSession(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${DAYS}d`)
    .sign(getSecret())
}

export function sessionCookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * DAYS,
    path: '/',
  }
}
