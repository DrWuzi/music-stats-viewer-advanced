import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isValidProfileTheme } from '@/lib/profile-themes'
import { isValidAvatarDecoration } from '@/components/avatar-decorations'
import { isValidProfileBackground } from '@/components/profile-backgrounds'

const MAX_TAGLINE_LENGTH = 60

function sanitizeTagline(raw: string): string {
  const stripped = raw
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[<>]/g, '')
    .trim()

  return stripped.slice(0, MAX_TAGLINE_LENGTH)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { profileTheme, profileTagline, avatarDecoration, profileBackground } = body as {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
  }

  const validTheme = isValidProfileTheme(profileTheme) ? profileTheme : undefined

  const validTagline =
    typeof profileTagline === 'string' ? sanitizeTagline(profileTagline) : undefined

  const validDecoration = isValidAvatarDecoration(avatarDecoration) ? avatarDecoration : undefined

  const validBackground = isValidProfileBackground(profileBackground) ? profileBackground : undefined

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(validTheme !== undefined ? { profileTheme: validTheme } : {}),
      ...(validTagline !== undefined ? { profileTagline: validTagline } : {}),
      ...(validDecoration !== undefined ? { avatarDecoration: validDecoration } : {}),
      ...(validBackground !== undefined ? { profileBackground: validBackground } : {}),
    },
  })

  return NextResponse.json({
    ok: true,
    profileTheme: validTheme,
    profileTagline: validTagline,
    avatarDecoration: validDecoration,
    profileBackground: validBackground,
  })
}
