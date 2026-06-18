import Link from 'next/link'
import { ArtistImage } from '@/components/artist-image'
import { SearchClient } from './SearchClient'

type Props = {
  searchParams?: Promise<{ q?: string; type?: string; username?: string }>
}

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'

interface LastFmArtistResult {
  name: string
  listeners: string
  mbid?: string
  url: string
  image: Array<{ '#text': string; size: string }>
}

interface LastFmAlbumResult {
  name: string
  artist: string
  url: string
  image: Array<{ '#text': string; size: string }>
}

interface LastFmTrackResult {
  name: string
  artist: string
  url: string
  listeners: string
}

interface LastFmUserResult {
  name: string
  realname?: string
  playcount: string
  image: Array<{ '#text': string; size: string }>
  url: string
}

async function searchArtists(q: string, apiKey: string): Promise<LastFmArtistResult[]> {
  try {
    const url = `${LASTFM_BASE}?method=artist.search&artist=${encodeURIComponent(q)}&api_key=${apiKey}&format=json&limit=10`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    return data?.results?.artistmatches?.artist ?? []
  } catch {
    return []
  }
}

async function searchAlbums(q: string, apiKey: string): Promise<LastFmAlbumResult[]> {
  try {
    const url = `${LASTFM_BASE}?method=album.search&album=${encodeURIComponent(q)}&api_key=${apiKey}&format=json&limit=10`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    return data?.results?.albummatches?.album ?? []
  } catch {
    return []
  }
}

async function searchTracks(q: string, apiKey: string): Promise<LastFmTrackResult[]> {
  try {
    const url = `${LASTFM_BASE}?method=track.search&track=${encodeURIComponent(q)}&api_key=${apiKey}&format=json&limit=10`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    return data?.results?.trackmatches?.track ?? []
  } catch {
    return []
  }
}

async function searchUsers(q: string, apiKey: string): Promise<LastFmUserResult[]> {
  // Last.fm has no user.search, so we try user.getinfo as a single lookup
  try {
    const url = `${LASTFM_BASE}?method=user.getinfo&user=${encodeURIComponent(q)}&api_key=${apiKey}&format=json`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data?.user) {
      return [
        {
          name: data.user.name,
          realname: data.user.realname || undefined,
          playcount: data.user.playcount,
          image: data.user.image ?? [],
          url: data.user.url,
        },
      ]
    }
    return []
  } catch {
    return []
  }
}

function getImageUrl(images: Array<{ '#text': string; size: string }>, size = 'medium'): string | null {
  const img = images.find((i) => i.size === size) ?? images[images.length - 1]
  return img?.['#text'] || null
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp?.q ?? ''
  const type = sp?.type ?? 'all'
  const username = sp?.username ?? ''
  const apiKey = process.env.LASTFM_API_KEY ?? ''

  const didSearch = q.trim() !== ''

  let artists: LastFmArtistResult[] = []
  let albums: LastFmAlbumResult[] = []
  let tracks: LastFmTrackResult[] = []
  let users: LastFmUserResult[] = []

  if (didSearch && apiKey) {
    const shouldFetch = (tab: string) => type === 'all' || type === tab

    const [a, al, t, u] = await Promise.all([
      shouldFetch('artists') ? searchArtists(q, apiKey) : Promise.resolve([]),
      shouldFetch('albums') ? searchAlbums(q, apiKey) : Promise.resolve([]),
      shouldFetch('tracks') ? searchTracks(q, apiKey) : Promise.resolve([]),
      shouldFetch('users') ? searchUsers(q, apiKey) : Promise.resolve([]),
    ])
    artists = a
    albums = al
    tracks = t
    users = u
  }

  const hasResults =
    artists.length > 0 || albums.length > 0 || tracks.length > 0 || users.length > 0

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'tracks', label: 'Tracks' },
    { id: 'users', label: 'Users' },
  ]

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      {/* Client-side: type-ahead suggestions + recent searches + tab switcher */}
      <SearchClient initialQ={q} initialType={type} username={username} />

      {/* Results */}
      {!didSearch && (
        <p className="text-muted-foreground text-sm mt-8">
          Enter a query to search Last.fm for artists, albums, tracks and users.
        </p>
      )}

      {didSearch && !hasResults && (
        <p className="text-muted-foreground text-sm mt-8">
          No results for &quot;{q}&quot;
          {type !== 'all' ? ` in ${type}` : ''}.
        </p>
      )}

      {didSearch && hasResults && (
        <div className="mt-6 space-y-8">
          {/* Artists */}
          {(type === 'all' || type === 'artists') && artists.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Artists
                {type === 'all' && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&type=artists${username ? `&username=${encodeURIComponent(username)}` : ''}`}
                    className="ml-2 text-sm font-normal text-muted-foreground hover:text-primary"
                  >
                    See all
                  </Link>
                )}
              </h2>
              <ul className="space-y-2">
                {artists.map((artist) => (
                  <li key={artist.name}>
                    <Link
                      href={`/artist/${encodeURIComponent(artist.name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`}
                      className="flex items-center gap-3 group rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                    >
                      <ArtistImage name={artist.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                          {artist.name}
                        </p>
                        {artist.listeners && Number(artist.listeners) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {Number(artist.listeners).toLocaleString()} listeners
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Albums */}
          {(type === 'all' || type === 'albums') && albums.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Albums
                {type === 'all' && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&type=albums${username ? `&username=${encodeURIComponent(username)}` : ''}`}
                    className="ml-2 text-sm font-normal text-muted-foreground hover:text-primary"
                  >
                    See all
                  </Link>
                )}
              </h2>
              <ul className="space-y-2">
                {albums.map((album) => {
                  const imgUrl = getImageUrl(album.image, 'medium')
                  return (
                    <li key={`${album.name}-${album.artist}`}>
                      <a
                        href={album.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 group rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={album.name}
                            className="h-10 w-10 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <svg
                              className="h-5 w-5 text-muted-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                            {album.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                        </div>
                        <svg
                          className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Tracks */}
          {(type === 'all' || type === 'tracks') && tracks.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Tracks
                {type === 'all' && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&type=tracks${username ? `&username=${encodeURIComponent(username)}` : ''}`}
                    className="ml-2 text-sm font-normal text-muted-foreground hover:text-primary"
                  >
                    See all
                  </Link>
                )}
              </h2>
              <ul className="space-y-1">
                {tracks.map((track) => (
                  <li key={`${track.name}-${track.artist}`}>
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                        <svg
                          className="h-4 w-4 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                          {track.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      {track.listeners && Number(track.listeners) > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {Number(track.listeners).toLocaleString()} listeners
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Users */}
          {(type === 'all' || type === 'users') && users.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Users</h2>
              <ul className="space-y-2">
                {users.map((user) => {
                  const imgUrl = getImageUrl(user.image, 'medium')
                  return (
                    <li key={user.name}>
                      <Link
                        href={`/user/${encodeURIComponent(user.name)}`}
                        className="flex items-center gap-3 group rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={user.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                              {user.name[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {user.name}
                          </p>
                          {user.realname && (
                            <p className="text-xs text-muted-foreground">{user.realname}</p>
                          )}
                          {user.playcount && Number(user.playcount) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {Number(user.playcount).toLocaleString()} scrobbles
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
