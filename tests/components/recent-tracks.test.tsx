import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentTracks } from '@/components/recent-tracks'
import { useNowPlaying } from '@/components/now-playing-context'

vi.mock('@/components/now-playing-context', () => ({
  useNowPlaying: vi.fn(),
}))

const tracks = [
  { artist: 'Radiohead', album: 'OK Computer', track: 'Karma Police', scrobbledAt: new Date('2026-01-01T10:00:00Z') },
  { artist: 'Boards of Canada', album: null, track: 'Roygbiv', scrobbledAt: new Date('2026-01-01T09:00:00Z') },
]

beforeEach(() => {
  vi.mocked(useNowPlaying).mockReturnValue({ data: null, isLoading: true, username: 'testuser' })
})

describe('RecentTracks', () => {
  it('renders all tracks', () => {
    render(<RecentTracks tracks={tracks} username="testuser" />)
    expect(screen.getByText('Karma Police')).toBeInTheDocument()
    expect(screen.getByText('Roygbiv')).toBeInTheDocument()
  })

  it('shows artist names', () => {
    render(<RecentTracks tracks={tracks} username="testuser" />)
    expect(screen.getByText(/Radiohead/)).toBeInTheDocument()
  })

  it('shows empty state when no tracks', () => {
    render(<RecentTracks tracks={[]} username="testuser" />)
    expect(screen.getByText(/no tracks/i)).toBeInTheDocument()
  })

  it('prepends live scrobbles not already in the initial list', () => {
    vi.mocked(useNowPlaying).mockReturnValue({
      data: {
        nowPlaying: false,
        recent: [
          {
            artist: 'New Band',
            track: 'Fresh Track',
            album: null,
            scrobbledAt: new Date('2026-01-01T11:00:00Z').toISOString(),
          },
        ],
      },
      isLoading: false,
      username: 'testuser',
    })
    render(<RecentTracks tracks={tracks} username="testuser" />)
    expect(screen.getByText('Fresh Track')).toBeInTheDocument()
  })

  it('does not duplicate a live entry that matches an existing track', () => {
    vi.mocked(useNowPlaying).mockReturnValue({
      data: {
        nowPlaying: false,
        recent: [
          {
            artist: 'Radiohead',
            track: 'Karma Police',
            album: 'OK Computer',
            scrobbledAt: tracks[0].scrobbledAt.toISOString(),
          },
        ],
      },
      isLoading: false,
      username: 'testuser',
    })
    render(<RecentTracks tracks={tracks} username="testuser" />)
    expect(screen.getAllByText('Karma Police')).toHaveLength(1)
  })
})
