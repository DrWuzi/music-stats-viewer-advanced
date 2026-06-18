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
    const params = new URLSearchParams({
      action: 'query',
      titles: name,
      prop: 'pageimages',
      pithumbsize: '600',
      pilimit: '1',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'LastFmAdvanced/1.0 (educational/personal project)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages: Array<{ thumbnail?: { source: string } }> = data?.query?.pages ?? []
    const src = pages[0]?.thumbnail?.source
    return src ?? null
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
