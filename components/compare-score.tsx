'use client'

interface CompareScoreProps {
  score: number
  user1: string
  user2: string
  sharedCount: number
}

function scoreStroke(score: number): string {
  if (score > 70) return 'var(--primary)'
  if (score >= 40) return 'oklch(0.7 0.18 55)'
  return 'oklch(0.65 0.22 20)'
}

export function CompareScore({ score, user1, user2, sharedCount }: CompareScoreProps) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={12}
        />
        {/* Progress arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={scoreStroke(score)}
          strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        {/* Center label */}
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fill="currentColor"
        >
          {score}%
        </text>
      </svg>
      <p className="text-base font-semibold">{user1} &amp; {user2}</p>
      <p className="text-sm text-muted-foreground">{sharedCount} shared artists</p>
    </div>
  )
}
