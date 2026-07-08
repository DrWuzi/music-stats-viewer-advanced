import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LovedTracks } from '@/components/loved-tracks'

describe('LovedTracks', () => {
  it('renders loved tracks', () => {
    render(<LovedTracks tracks={[{ artist: 'Radiohead', track: 'Exit Music', lovedAt: new Date() }]} username="testuser" />)
    expect(screen.getByText('Exit Music')).toBeInTheDocument()
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<LovedTracks tracks={[]} username="testuser" />)
    expect(screen.getByText(/no loved tracks/i)).toBeInTheDocument()
  })
})
