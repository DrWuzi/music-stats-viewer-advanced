export const runtime = 'nodejs'

const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
const CACHE = { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } }
const CACHE_MISS = { headers: { 'Cache-Control': 'public, max-age=3600' } }

async function fromLastfm(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${process.env.LASTFM_API_KEY}&format=json`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const images: Array<{ '#text': string; size: string }> = data?.artist?.image ?? []
    for (const size of ['mega', 'extralarge', 'large']) {
      const img = images.find((i) => i.size === size)
      if (img?.['#text'] && !img['#text'].includes(PLACEHOLDER) && img['#text'].length > 10) {
        return img['#text']
      }
    }
  } catch {}
  return null
}

async function fromWikipedia(name: string): Promise<string | null> {
  try {
    // Wikipedia uses underscores for spaces, title-cased
    const title = name.trim().replace(/ /g, '_')
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { 'User-Agent': 'LastFmAdvanced/1.0 (educational/personal project)' },
        next: { revalidate: 86400 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const src: string | undefined = data?.thumbnail?.source
    if (!src) return null
    // Bump resolution: Wikipedia thumbnails often have /320px- in path; replace with /600px-
    return src.replace(/\/\d+px-/, '/600px-')
  } catch {}
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name) return Response.json({ url: null }, { status: 400 })

  const url = (await fromLastfm(name)) ?? (await fromWikipedia(name))
  return Response.json({ url }, url ? CACHE : CACHE_MISS)
}
