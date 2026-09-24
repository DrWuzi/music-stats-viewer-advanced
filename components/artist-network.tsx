'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ArtistImage } from '@/components/artist-image'
import { artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface TopArtist {
  name: string
  playcount: number
}

interface Props {
  scrobbles: Scrobble[]
  topArtists: TopArtist[]
  username: string
}

interface Connection {
  from: number
  to: number
  weight: number
}

interface NodePosition {
  x: number
  y: number
  r: number
  artist: TopArtist
}

const SESSION_GAP_MS = 60 * 60 * 1000 // 1 hour

export function ArtistNetwork({ scrobbles, topArtists, username }: Props) {
  const router = useRouter()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const top10 = useMemo(() => topArtists.slice(0, 10), [topArtists])

  const { nodes, connections } = useMemo(() => {
    if (top10.length === 0) return { nodes: [], connections: [] }

    const artistSet = new Set(top10.map((a) => a.name))

    // Sort scrobbles ascending by time
    const sorted = [...scrobbles]
      .filter((s) => artistSet.has(s.artist))
      .sort((a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime())

    // Count co-occurrences within 1-hour windows
    const coCount = new Map<string, number>()

    for (let i = 0; i < sorted.length; i++) {
      const base = new Date(sorted[i].scrobbledAt).getTime()
      for (let j = i + 1; j < sorted.length; j++) {
        const t = new Date(sorted[j].scrobbledAt).getTime()
        if (t - base > SESSION_GAP_MS) break
        if (sorted[j].artist === sorted[i].artist) continue
        const key =
          sorted[i].artist < sorted[j].artist
            ? `${sorted[i].artist}|||${sorted[j].artist}`
            : `${sorted[j].artist}|||${sorted[i].artist}`
        coCount.set(key, (coCount.get(key) ?? 0) + 1)
      }
    }

    // Build index map
    const idxMap = new Map(top10.map((a, i) => [a.name, i]))

    const connections: Connection[] = []
    for (const [key, weight] of coCount.entries()) {
      const [a, b] = key.split('|||')
      const from = idxMap.get(a)
      const to = idxMap.get(b)
      if (from !== undefined && to !== undefined) {
        connections.push({ from, to, weight })
      }
    }

    // Normalize connections weight for opacity
    const maxWeight = Math.max(...connections.map((c) => c.weight), 1)
    const normalizedConnections = connections.map((c) => ({
      ...c,
      weight: c.weight / maxWeight,
    }))

    // Compute node positions in a circle
    const count = top10.length
    const cx = 200
    const cy = 200
    const radius = 140
    const maxPlay = Math.max(...top10.map((a) => a.playcount), 1)

    const nodes: NodePosition[] = top10.map((artist, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      // Bubble radius: 18–34px based on playcount
      const r = 18 + Math.round((artist.playcount / maxPlay) * 16)
      return { x, y, r, artist }
    })

    return { nodes, connections: normalizedConnections }
  }, [top10, scrobbles])

  if (top10.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Related Artists Network</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Users} title="No artist data available." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Artists Network</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <div className="relative w-[400px] h-[400px]">
          {/* SVG layer for connection lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={400}
            height={400}
            viewBox="0 0 400 400"
          >
            <defs>
              <filter id="network-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {connections.map((conn, i) => {
              const from = nodes[conn.from]
              const to = nodes[conn.to]
              const isHoveredRelated =
                hoveredIdx === conn.from || hoveredIdx === conn.to
              const opacity =
                hoveredIdx === null
                  ? 0.28 + conn.weight * 0.52
                  : isHoveredRelated
                    ? 0.85
                    : 0.08
              const lineWidth = hoveredIdx !== null && isHoveredRelated ? 4 : 1.75 + conn.weight * 2.75
              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--primary)"
                  strokeWidth={lineWidth}
                  strokeLinecap="round"
                  filter="url(#network-line-glow)"
                  strokeOpacity={opacity}
                />
              )
            })}
          </svg>

          {/* Artist bubble nodes */}
          {nodes.map((node, i) => {
            const isHovered = hoveredIdx === i
            const isConnected =
              hoveredIdx !== null &&
              connections.some(
                (c) =>
                  (c.from === hoveredIdx && c.to === i) ||
                  (c.to === hoveredIdx && c.from === i)
              )
            const dimmed = hoveredIdx !== null && !isHovered && !isConnected

            return (
              <div
                key={node.artist.name}
                role="button"
                tabIndex={0}
                className="absolute flex items-center justify-center cursor-pointer transition-transform duration-150"
                style={{
                  left: node.x - node.r,
                  top: node.y - node.r,
                  width: node.r * 2,
                  height: node.r * 2,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  opacity: dimmed ? 0.35 : 1,
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => router.push(artistHref(node.artist.name, username))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(artistHref(node.artist.name, username))
                  }
                }}
                aria-label={`View ${node.artist.name}`}
              >
                {/* Outer ring on hover */}
                {isHovered && (
                  <span
                    className="absolute inset-0 rounded-full ring-2 ring-offset-1 ring-primary pointer-events-none"
                    style={{ borderRadius: '50%' }}
                  />
                )}
                <div
                  style={{ width: node.r * 2, height: node.r * 2 }}
                  className="flex items-center justify-center rounded-full overflow-hidden shrink-0"
                >
                  <ArtistImage
                    name={node.artist.name}
                    size="sm"
                    className="h-full w-full rounded-full"
                  />
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-20 pointer-events-none whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      top: node.r * 2 + 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span className="block font-semibold">{node.artist.name}</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {node.artist.playcount.toLocaleString('en-US')} plays
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Lines connect artists played within 1 hour of each other. Bubble size = play count.
        </p>
      </CardContent>
    </Card>
  )
}
