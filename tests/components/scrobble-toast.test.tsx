import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrobbleToast } from '@/components/scrobble-toast'
import { useNowPlaying } from '@/components/now-playing-context'

vi.mock('@/components/now-playing-context', () => ({
  useNowPlaying: vi.fn(),
}))

function activity(recent: { artist: string; track: string; album: string | null; scrobbledAt: string }[]) {
  return { data: { nowPlaying: false, recent }, isLoading: false, username: 'testuser' }
}

beforeEach(() => {
  vi.mocked(useNowPlaying).mockReturnValue({ data: null, isLoading: true, username: 'testuser' })
})

describe('ScrobbleToast', () => {
  it('does not toast for scrobbles already present at mount', () => {
    vi.mocked(useNowPlaying).mockReturnValue(
      activity([{ artist: 'Radiohead', track: 'Karma Police', album: null, scrobbledAt: '2026-01-01T10:00:00Z' }]),
    )
    render(<ScrobbleToast username="testuser" />)
    expect(screen.queryByText(/just scrobbled/)).not.toBeInTheDocument()
  })

  it('toasts a new scrobble that arrives after mount', () => {
    vi.mocked(useNowPlaying).mockReturnValue(
      activity([{ artist: 'Radiohead', track: 'Karma Police', album: null, scrobbledAt: '2026-01-01T10:00:00Z' }]),
    )
    const { rerender } = render(<ScrobbleToast username="testuser" />)
    expect(screen.queryByText(/just scrobbled/)).not.toBeInTheDocument()

    vi.mocked(useNowPlaying).mockReturnValue(
      activity([
        { artist: 'Boards of Canada', track: 'Roygbiv', album: null, scrobbledAt: '2026-01-01T10:05:00Z' },
        { artist: 'Radiohead', track: 'Karma Police', album: null, scrobbledAt: '2026-01-01T10:00:00Z' },
      ]),
    )
    rerender(<ScrobbleToast username="testuser" />)

    expect(screen.getByText(/just scrobbled/)).toBeInTheDocument()
    expect(screen.getByText(/Roygbiv/)).toBeInTheDocument()
    expect(screen.getByText(/Boards of Canada/)).toBeInTheDocument()
  })

  it('does not re-toast the same track on a poll that returns unchanged data', () => {
    const first = activity([{ artist: 'Radiohead', track: 'Karma Police', album: null, scrobbledAt: '2026-01-01T10:00:00Z' }])
    vi.mocked(useNowPlaying).mockReturnValue(first)
    const { rerender } = render(<ScrobbleToast username="testuser" />)

    vi.mocked(useNowPlaying).mockReturnValue(
      activity([{ artist: 'Boards of Canada', track: 'Roygbiv', album: null, scrobbledAt: '2026-01-01T10:05:00Z' }]),
    )
    rerender(<ScrobbleToast username="testuser" />)
    expect(screen.getByText(/Roygbiv/)).toBeInTheDocument()

    // Same latest track/timestamp on the next poll — should not toast again.
    vi.mocked(useNowPlaying).mockReturnValue(
      activity([{ artist: 'Boards of Canada', track: 'Roygbiv', album: null, scrobbledAt: '2026-01-01T10:05:00Z' }]),
    )
    rerender(<ScrobbleToast username="testuser" />)
    expect(screen.getAllByText(/Roygbiv/)).toHaveLength(1)
  })
})
