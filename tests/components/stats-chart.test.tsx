import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsChart } from '@/components/stats-chart'

describe('StatsChart', () => {
  it('renders chart title with scrobble data', () => {
    const scrobbles = Array.from({ length: 5 }, (_, i) => ({
      scrobbledAt: new Date(Date.now() - i * 86400000),
    }))
    render(<StatsChart scrobbles={scrobbles} />)
    expect(screen.getByText(/scrobbles/i)).toBeInTheDocument()
  })

  it('renders empty state with no scrobbles', () => {
    render(<StatsChart scrobbles={[]} />)
    expect(screen.getByText(/no scrobble data/i)).toBeInTheDocument()
  })
})
