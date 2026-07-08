import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { lastfmClient } from '@/lib/lastfm'
import { ProfileNavTabs } from '@/components/profile-nav-tabs'
import { ProfileBannerLive } from '@/components/profile-banner-live'

type Props = { children: ReactNode; params: Promise<{ username: string }> }

export default async function UserLayout({ children, params }: Props) {
  const { username } = await params

  const [session, user, userInfo] = await Promise.all([
    getSession(),
    prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: {
        id: true,
        createdAt: true,
        lastSyncedAt: true,
        profileTheme: true,
        profileTagline: true,
        avatarDecoration: true,
        profileBackground: true,
        loadingAnimation: true,
      },
    }),
    lastfmClient.getUserInfo(username).catch(() => null),
  ])

  // If user doesn't exist in DB yet, the page.tsx handles first-time sync/creation.
  // Only 404 if the username doesn't exist on Last.fm at all.
  if (!user && !userInfo) notFound()

  const isOwner = session?.lastfmUsername === username
  const totalScrobbles = userInfo?.playcount ?? 0
  const rawImageUrl = userInfo?.imageUrl ?? ''
  const imageUrl = rawImageUrl.includes('2a96cbd8b46e442fc41c2b86b821562f') ? '' : rawImageUrl
  const registeredAt = userInfo?.registered ?? user?.createdAt ?? new Date()

  const reg = new Date(registeredAt)
  const now = new Date()
  let years = now.getFullYear() - reg.getFullYear()
  const monthDiff = now.getMonth() - reg.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < reg.getDate())) years--

  return (
    // NOTE: this used to be `display: contents` (Tailwind's `contents` class)
    // so it stayed purely structural with zero layout/visual impact. Chromium
    // has a long-standing print bug where a `display: contents` element's
    // entire descendant subtree can fail to paint during the print layout
    // pass — since this div is the single common ancestor of the banner, nav
    // tabs, AND {children} on every profile page, that blanked the whole
    // page when printing, not just the banner. A plain block div has no
    // visual effect here anyway (its children are already block-level and
    // this element carries no padding/margin/border of its own), so we drop
    // `contents` and keep only the class needed for --profile-accent scoping.
    <div className="profile-theme-scope">
      {/* Persistent profile banner — survives tab navigation */}
      <div className="container mx-auto px-4 max-w-[var(--content-max-width)]">
        <ProfileBannerLive
          username={username}
          imageUrl={imageUrl}
          totalScrobbles={totalScrobbles}
          registeredAt={registeredAt}
          years={years}
          isOwner={isOwner}
          lastSyncedAt={user?.lastSyncedAt ?? null}
          initialTheme={user?.profileTheme ?? null}
          initialTagline={user?.profileTagline ?? null}
          initialAvatarDecoration={user?.avatarDecoration ?? null}
          initialBackground={user?.profileBackground ?? null}
          initialLoadingAnimation={user?.loadingAnimation ?? null}
        />

        <div className="mt-3">
          <ProfileNavTabs username={username} />
        </div>
      </div>

      {children}
    </div>
  )
}
