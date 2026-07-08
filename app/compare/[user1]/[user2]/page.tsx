import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArtistImage } from '@/components/artist-image'
import { artistHref } from '@/lib/urls'

type Props = { params: Promise<{ user1: string; user2: string }> }

interface LastfmArtist {
  name: string
  playcount: string
  mbid?: string
  url: string
  image?: Array<{ '#text': string; size: string }>
}

interface LastfmTopArtistsResponse {
  topartists?: {
    artist: LastfmArtist[]
    '@attr': { user: string; totalPages: string; page: string; perPage: string; total: string }
  }
  error?: number
  message?: string
}

interface UserInfo {
  name: string
  image?: Array<{ '#text': string; size: string }>
  playcount?: string
}

interface LastfmUserInfoResponse {
  user?: UserInfo
  error?: number
  message?: string
}

async function fetchTopArtists(username: string): Promise<LastfmArtist[] | null> {
  const key = process.env.LASTFM_API_KEY
  if (!key) throw new Error('LASTFM_API_KEY not set')

  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists` +
    `&user=${encodeURIComponent(username)}&api_key=${key}&format=json&limit=50`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const data: LastfmTopArtistsResponse = await res.json()
  if (data.error) return null
  return data.topartists?.artist ?? []
}

async function fetchUserInfo(username: string): Promise<UserInfo | null> {
  const key = process.env.LASTFM_API_KEY
  if (!key) return null

  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getinfo` +
    `&user=${encodeURIComponent(username)}&api_key=${key}&format=json`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data: LastfmUserInfoResponse = await res.json()
    if (data.error) return null
    return data.user ?? null
  } catch {
    return null
  }
}

function getUserAvatar(info: UserInfo | null): string | null {
  if (!info?.image) return null
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
  for (const size of ['extralarge', 'large', 'medium']) {
    const img = info.image.find((i) => i.size === size)
    if (img?.['#text'] && !img['#text'].includes(PLACEHOLDER) && img['#text'].length > 10) {
      return img['#text']
    }
  }
  return null
}

function compatibilityLabel(score: number): string {
  if (score >= 60) return 'Music Twins!'
  if (score >= 40) return 'Great Overlap'
  if (score >= 20) return 'Some Overlap'
  if (score >= 5) return 'A Little in Common'
  return 'Very Different Taste'
}

function compatibilityColor(score: number): string {
  if (score >= 60) return 'var(--primary)'
  if (score >= 40) return 'oklch(0.7 0.18 55)'
  return 'oklch(0.65 0.22 20)'
}

export async function generateMetadata({ params }: Props) {
  const { user1, user2 } = await params
  return { title: `${user1} vs ${user2} — Last.fm Advanced` }
}

export default async function ComparePage({ params }: Props) {
  const { user1, user2 } = await params

  const [artists1, artists2, info1, info2] = await Promise.all([
    fetchTopArtists(user1),
    fetchTopArtists(user2),
    fetchUserInfo(user1),
    fetchUserInfo(user2),
  ])

  if (artists1 === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="text-muted-foreground">
            Could not find Last.fm user <strong>{user1}</strong>.
          </p>
          <Link href="/compare" className="text-primary underline">
            Try another comparison
          </Link>
        </div>
      </div>
    )
  }

  if (artists2 === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="text-muted-foreground">
            Could not find Last.fm user <strong>{user2}</strong>.
          </p>
          <Link href="/compare" className="text-primary underline">
            Try another comparison
          </Link>
        </div>
      </div>
    )
  }

  // Build sets for comparison
  const set1 = new Map(artists1.map((a) => [a.name.toLowerCase(), a]))
  const set2 = new Map(artists2.map((a) => [a.name.toLowerCase(), a]))

  const sharedKeys = [...set1.keys()].filter((k) => set2.has(k))
  const unionSize = new Set([...set1.keys(), ...set2.keys()]).size
  const jaccardScore = unionSize > 0 ? Math.round((sharedKeys.length / unionSize) * 100) : 0

  const sharedArtists = sharedKeys.map((k) => {
    const a1 = set1.get(k)!
    return { name: a1.name, playcount1: parseInt(a1.playcount, 10), playcount2: parseInt(set2.get(k)!.playcount, 10) }
  }).sort((a, b) => (b.playcount1 + b.playcount2) - (a.playcount1 + a.playcount2))

  const uniqueToUser1 = artists1.filter((a) => !set2.has(a.name.toLowerCase()))
  const uniqueToUser2 = artists2.filter((a) => !set1.has(a.name.toLowerCase()))

  const avatar1 = getUserAvatar(info1)
  const avatar2 = getUserAvatar(info2)

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - jaccardScore / 100)
  const strokeColor = compatibilityColor(jaccardScore)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Back link */}
        <div>
          <Link href="/compare" className="text-muted-foreground hover:text-foreground text-sm">
            ← Back to compare
          </Link>
        </div>

        {/* User headers */}
        <div className="grid grid-cols-3 items-center gap-4">
          {/* User 1 */}
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar1 ? (
              <img
                src={avatar1}
                alt={user1}
                width={72}
                height={72}
                className="rounded-full h-18 w-18 object-cover border-2 border-border"
              />
            ) : (
              <div className="h-18 w-18 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-border">
                {user1[0]?.toUpperCase()}
              </div>
            )}
            <Link href={`/user/${user1}`} className="font-bold text-lg hover:underline">
              {user1}
            </Link>
            {info1?.playcount && (
              <p className="text-xs text-muted-foreground">
                {parseInt(info1.playcount, 10).toLocaleString()} scrobbles
              </p>
            )}
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <span className="text-2xl font-black text-muted-foreground">VS</span>
          </div>

          {/* User 2 */}
          <div className="flex flex-col items-center gap-2">
            {avatar2 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar2}
                alt={user2}
                width={72}
                height={72}
                className="rounded-full h-18 w-18 object-cover border-2 border-border"
              />
            ) : (
              <div className="h-18 w-18 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-border">
                {user2[0]?.toUpperCase()}
              </div>
            )}
            <Link href={`/user/${user2}`} className="font-bold text-lg hover:underline">
              {user2}
            </Link>
            {info2?.playcount && (
              <p className="text-xs text-muted-foreground">
                {parseInt(info2.playcount, 10).toLocaleString()} scrobbles
              </p>
            )}
          </div>
        </div>

        {/* Compatibility score */}
        <div
          className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-3"
        >
          <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
            Compatibility Score
          </p>
          <svg width="140" height="140" viewBox="0 0 120 120" aria-label={`${jaccardScore}% compatible`}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth={12} />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={12}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor">
              {jaccardScore}%
            </text>
          </svg>
          <p className="text-2xl font-bold">{jaccardScore}% Compatible</p>
          <p className="text-base text-muted-foreground">{compatibilityLabel(jaccardScore)}</p>
          <p className="text-sm text-muted-foreground">
            {sharedArtists.length} shared artist{sharedArtists.length !== 1 ? 's' : ''} out of{' '}
            {unionSize} unique
          </p>
        </div>

        {/* Both love */}
        {sharedArtists.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Both love:</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sharedArtists.map((a) => (
                <div
                  key={a.name}
                  className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-2 text-center"
                >
                  <ArtistImage name={a.name} size="md" />
                  <Link href={artistHref(a.name, user1)} className="text-sm font-medium leading-tight line-clamp-2 hover:underline">
                    {a.name}
                  </Link>
                  <div className="w-full text-xs text-muted-foreground space-y-0.5">
                    <p>{a.playcount1.toLocaleString()} plays by {user1}</p>
                    <p>{a.playcount2.toLocaleString()} plays by {user2}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Unique to each user */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unique to user1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Only {user1} likes:</h2>
            {uniqueToUser1.length === 0 ? (
              <p className="text-muted-foreground text-sm">All artists are shared!</p>
            ) : (
              <div className="space-y-2">
                {uniqueToUser1.slice(0, 15).map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <ArtistImage name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={artistHref(a.name, user1)} className="text-sm font-medium truncate hover:underline block">
                        {a.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {parseInt(a.playcount, 10).toLocaleString()} plays
                      </p>
                    </div>
                  </div>
                ))}
                {uniqueToUser1.length > 15 && (
                  <p className="text-xs text-muted-foreground pl-1">
                    +{uniqueToUser1.length - 15} more
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Unique to user2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Only {user2} likes:</h2>
            {uniqueToUser2.length === 0 ? (
              <p className="text-muted-foreground text-sm">All artists are shared!</p>
            ) : (
              <div className="space-y-2">
                {uniqueToUser2.slice(0, 15).map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <ArtistImage name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={artistHref(a.name, user1)} className="text-sm font-medium truncate hover:underline block">
                        {a.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {parseInt(a.playcount, 10).toLocaleString()} plays
                      </p>
                    </div>
                  </div>
                ))}
                {uniqueToUser2.length > 15 && (
                  <p className="text-xs text-muted-foreground pl-1">
                    +{uniqueToUser2.length - 15} more
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
