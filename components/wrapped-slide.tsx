'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WrappedSlideProps {
  slideNum: number
  total: number
  title: string
  stat: React.ReactNode
  subtitle: string
  accent: string
  onPrev: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

export function WrappedSlide({
  slideNum,
  total,
  title,
  stat,
  subtitle,
  accent,
  onPrev,
  onNext,
  isFirst,
  isLast,
}: WrappedSlideProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Card
        className="w-full max-w-lg rounded-3xl border-0 shadow-2xl overflow-hidden"
        style={{ background: accent }}
      >
        <CardContent className="p-10 flex flex-col items-center justify-center min-h-[420px] text-center space-y-6">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {title}
          </p>
          <p
            className="text-6xl font-bold leading-none break-words w-full"
            style={{ color: 'rgba(255,255,255,1)' }}
          >
            {stat}
          </p>
          <p
            className="text-lg font-medium"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            {subtitle}
          </p>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums w-12 text-center">
          {slideNum} / {total}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={isLast}
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
