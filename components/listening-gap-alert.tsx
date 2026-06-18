'use client'

import { AlertCircle } from 'lucide-react'

interface ListeningGapAlertProps {
  scrobbles: { scrobbledAt: Date }[]
  username: string
}

export function ListeningGapAlert({ scrobbles, username }: ListeningGapAlertProps) {
  if (!scrobbles.length) return null

  const mostRecent = scrobbles.reduce<Date | null>((latest, s) => {
    const d = new Date(s.scrobbledAt)
    return latest === null || d > latest ? d : latest
  }, null)

  if (!mostRecent) return null

  const now = new Date()
  const diffMs = now.getTime() - mostRecent.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return null

  const isLong = diffDays > 30
  const message = isLong
    ? `${username} hasn't scrobbled in ${diffDays} days. Where did the music go?`
    : `You haven't scrobbled in ${diffDays} day${diffDays === 1 ? '' : 's'}! Miss your music?`

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm mb-4"
      style={{
        borderColor: isLong
          ? 'color-mix(in oklch, var(--destructive) 40%, transparent)'
          : 'color-mix(in oklch, var(--primary) 30%, transparent)',
        background: isLong
          ? 'color-mix(in oklch, var(--destructive) 8%, transparent)'
          : 'color-mix(in oklch, var(--primary) 5%, transparent)',
        color: 'var(--foreground)',
      }}
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{
          color: isLong
            ? 'var(--destructive)'
            : 'var(--primary)',
        }}
      />
      <span>{message}</span>
    </div>
  )
}
