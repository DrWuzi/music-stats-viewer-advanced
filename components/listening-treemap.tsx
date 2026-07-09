'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TreePine } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  topArtists: { name: string; playcount: number }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, name, index = 0, root, depth } = props

  // Skip the root node (depth 0) and nodes with no visible area
  if (depth === 0 || !width || !height) return <g />

  const total: number = props.total ?? 1
  const opacity = total > 1 ? 1 - (index / (total - 1)) * 0.7 : 1
  const fill = `color-mix(in oklch, var(--primary) ${Math.round(opacity * 100)}%, transparent)`
  const showText = width > 40 && height > 24

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--background)" strokeWidth={2} />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.min(13, Math.max(9, width / 8))}
          fontWeight={500}
          style={{ pointerEvents: 'none' }}
        >
          {name && name.length > Math.floor(width / 7) ? name.slice(0, Math.floor(width / 7)) + '…' : name}
        </text>
      )}
    </g>
  )
}

interface TooltipPayloadItem {
  payload?: { name?: string; size?: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">{item.size?.toLocaleString()} plays</p>
    </div>
  )
}

export function ListeningTreemap({ topArtists }: Props) {
  if (topArtists.length < 3) {
    return (
      <Card>
        <CardHeader><CardTitle>Your Listening Universe</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={TreePine} title="Not enough data yet — keep scrobbling!" size="compact" />
        </CardContent>
      </Card>
    )
  }

  const data = topArtists
    .map((a) => ({ name: a.name, size: a.playcount }))
    .filter((a) => a.size > 0)
  const total = data.length

  // Pass `total` through the content renderer via closure
  const renderContent = (props: unknown) => <CustomContent {...(props as object)} total={total} />

  return (
    <Card>
      <CardHeader><CardTitle>Your Listening Universe</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            content={renderContent}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
