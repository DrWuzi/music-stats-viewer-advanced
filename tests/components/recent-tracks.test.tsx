import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentTracks } from '@/components/recent-tracks'

const tracks = [
  { artist: 'Radiohead', album: 'OK Computer', track: 'Karma Police', scrobbledAt: new Date() },
  { artist: 'Boards of Canada', album: null, track: 'Roygbiv', scrobbledAt: new Date() },
]

describe('RecentTracks', () => {
  it('renders all tracks', () => {
    render(<RecentTracks tracks={tracks} />)
    expect(screen.getByText('Karma Police')).toBeInTheDocument()
    expect(screen.getByText('Roygbiv')).toBeInTheDocument()
  })

  it('shows artist names', () => {
    render(<RecentTracks tracks={tracks} />)
    expect(screen.getByText(/Radiohead/)).toBeInTheDocument()
  })

  it('shows empty state when no tracks', () => {
    render(<RecentTracks tracks={[]} />)
    expect(screen.getByText(/no tracks/i)).toBeInTheDocument()
  })
})
