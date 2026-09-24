import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const periods = ['7day', '1month', '3month', '6month', '12month', 'overall'] as Period[]
const empty = Object.fromEntries(periods.map((p) => [p, []])) as Record<Period, never[]>

describe('UserProfile', () => {
  it('renders the stats banner and Overview category tabs', () => {
    // Username/scrobble-count text lives in the persistent ProfileBannerLive
    // component rendered by the profile layout, not inside UserProfile itself
    // — this only asserts on what UserProfile actually renders: the stats
    // banner and the Overview tab strip (see lib/dashboard-widgets.ts).
    render(
      <UserProfile
        username="testuser"
        totalScrobbles={1234}
        registeredAt={new Date('2020-01-01')}
        imageUrl=""
        lastSyncedAt={null}
        isOwner={false}
        recentTracks={[]}
        topArtists={empty}
        topAlbums={empty}
        topTracks={empty}
        lovedTracks={[]}
        allScrobbles={[]}
      />,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('At a Glance')).toBeInTheDocument()
  })
})
