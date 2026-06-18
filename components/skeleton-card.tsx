import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface SkeletonCardProps {
  height?: number
  lines?: number
  showTitle?: boolean
}

const LINE_WIDTHS = ['w-full', 'w-4/5', 'w-2/3']

export function SkeletonCard({ height = 200, lines = 3, showTitle = true }: SkeletonCardProps) {
  return (
    <Card className="animate-pulse">
      {showTitle && (
        <CardHeader>
          <div className="h-5 w-1/3 bg-muted rounded" />
        </CardHeader>
      )}
      <CardContent style={{ height }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-muted rounded mb-2 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
          />
        ))}
      </CardContent>
    </Card>
  )
}
