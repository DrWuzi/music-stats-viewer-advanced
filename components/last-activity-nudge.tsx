'use client'

interface LastActivityNudgeProps {
  lastSyncedAt: Date | string | null
  className?: string
}

export function LastActivityNudge({ lastSyncedAt, className = 'text-muted-foreground' }: LastActivityNudgeProps) {
  if (lastSyncedAt === null) return null

  const syncDate = new Date(lastSyncedAt)
  const now = new Date()
  const diffMs = now.getTime() - syncDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  // More than 7 days ago: show nothing
  if (diffDays > 7) return null

  // Synced today: show nothing
  if (diffDays < 1) return null

  const daysAgo = Math.floor(diffDays)

  return (
    <p className={`text-xs ${className}`}>
      Last synced: {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
    </p>
  )
}
