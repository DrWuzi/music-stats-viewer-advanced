import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const user = await prisma.user.findFirst({
    where: { lastfmUsername: { equals: username, mode: "insensitive" } },
  })

  if (!user) {
    return new Response("Not found", { status: 404 })
  }

  const scrobbleCount = await prisma.scrobble.count({ where: { userId: user.id } })

  const topArtist = await prisma.topArtist.findFirst({
    where: { userId: user.id, period: "overall" },
    orderBy: { rank: "asc" },
  })

  const bars = [
    { x: 900, height: 120 },
    { x: 950, height: 200 },
    { x: 1000, height: 80 },
    { x: 1050, height: 160 },
    { x: 1100, height: 100 },
  ]

  const barRects = bars
    .map(
      ({ x, height }) =>
        `<rect x="${x}" y="${630 - height}" width="30" height="${height}" fill="#1e293b" />`
    )
    .join("\n  ")

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect x="0" y="0" width="1200" height="630" fill="#0f172a" />
  ${barRects}
  <text x="60" y="180" font-size="90" font-weight="bold" fill="white" font-family="system-ui, sans-serif">${username}</text>
  <text x="60" y="250" font-size="36" fill="#94a3b8" font-family="system-ui, sans-serif">Last.fm Dashboard</text>
  <text x="60" y="380" font-size="56" fill="#f8fafc" font-family="system-ui, sans-serif">${scrobbleCount.toLocaleString('en-US')} scrobbles</text>
  <text x="60" y="450" font-size="30" fill="#64748b" font-family="system-ui, sans-serif">Top Artist: ${topArtist?.name ?? "Unknown"}</text>
  <text x="60" y="570" font-size="24" fill="#334155" font-family="system-ui, sans-serif">lastfm-advanced.vercel.app</text>
</svg>`

  return new Response(svgString, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
