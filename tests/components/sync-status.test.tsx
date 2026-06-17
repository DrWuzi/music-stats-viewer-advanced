import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncStatus } from '@/components/sync-status'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('SyncStatus', () => {
  it('shows "Never synced" when lastSyncedAt is null', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={false} />)
    expect(screen.getByText(/never synced/i)).toBeInTheDocument()
  })

  it('shows relative sync time when lastSyncedAt is set', () => {
    render(<SyncStatus lastSyncedAt={new Date(Date.now() - 60000)} isOwner={false} />)
    expect(screen.getByText(/synced/i)).toBeInTheDocument()
  })

  it('shows sync button for owner', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={true} />)
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
  })

  it('hides sync button for non-owner', () => {
    render(<SyncStatus lastSyncedAt={null} isOwner={false} />)
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument()
  })
})
