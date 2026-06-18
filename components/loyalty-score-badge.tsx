'use client'

import { useMemo } from 'react'
import { Heart, Scale3d, Compass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LoyaltyScoreBadgeProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
}

export function LoyaltyScoreBadge({ topArtists, totalScrobbles }: LoyaltyScoreBadgeProps) {
  const { loyalty, label, icon: Icon, colorClass } = useMemo(() => {
    const top5plays = topArtists.slice(0, 5).reduce((s, a) => s + a.playcount, 0)
    const loyalty = totalScrobbles > 0 ? (top5plays / totalScrobbles) * 100 : 0

    if (loyalty >= 50) {
      return {
        loyalty,
        label: 'The Loyalist',
        icon: Heart,
        colorClass: 'text-red-500',
      }
    } else if (loyalty >= 30) {
      return {
        loyalty,
        label: 'Balanced',
        icon: Scale3d,
        colorClass: 'text-yellow-500',
      }
    } else {
      return {
        loyalty,
        label: 'The Explorer',
        icon: Compass,
        colorClass: 'text-green-500',
      }
    }
  }, [topArtists, totalScrobbles])

  const tooltipText = `Your top 5 artists account for ${loyalty.toFixed(1)}% of your listening`

  return (
    <Badge
      variant="outline"
      className="gap-1.5 cursor-default"
      title={tooltipText}
    >
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  )
}
