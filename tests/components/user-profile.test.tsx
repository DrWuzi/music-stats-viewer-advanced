import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

const periods = ['7day', '1month', '3month', '6month', '12month', 'overall'] as Period[]
const empty = Object.fromEntries(periods.map((p) => [p, []])) as Record<Period, never[]>

describe('UserProfile', () => {
  it('renders username and scrobble count in header', () => {
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
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText(/1,234 scrobbles/)).toBeInTheDocument()
  })
})
