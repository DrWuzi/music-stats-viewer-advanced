import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopLists } from '@/components/top-lists'
import type { Period } from '@/lib/lastfm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const artists = [{ name: 'Radiohead', playcount: 500, rank: 1 }]
const albums = [{ name: 'OK Computer', artist: 'Radiohead', playcount: 200, rank: 1 }]
const tracks = [{ name: 'Karma Police', artist: 'Radiohead', playcount: 50, rank: 1 }]

describe('TopLists', () => {
  it('renders top artist name and playcount', () => {
    render(
      <TopLists username="testuser" artists={artists} albums={albums} tracks={tracks} period="7day" onPeriodChange={vi.fn()} />,
    )
    expect(screen.getByText('Radiohead')).toBeInTheDocument()
    expect(screen.getByText('500 plays')).toBeInTheDocument()
  })

  it('shows empty state when no artists', () => {
    render(
      <TopLists username="testuser" artists={[]} albums={[]} tracks={[]} period="7day" onPeriodChange={vi.fn()} />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
