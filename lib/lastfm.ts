import { cache } from 'react'
import { createHash } from 'crypto'

const BASE = 'https://ws.audioscrobbler.com/2.0/'
const key = () => process.env.LASTFM_API_KEY!
const secret = () => process.env.LASTFM_API_SECRET!

export type Period = '7day' | '1month' | '3month' | '6month' | '12month' | 'overall'

export interface LastFmTrack {
  name: string
  artist: string
  album: string | null
  scrobbledAt: Date | null
}

export interface LastFmArtist {
  name: string
  playcount: number
  rank: number
}

export interface LastFmAlbum {
  name: string
  artist: string
  playcount: number
  rank: number
}

export interface LastFmTrackTop {
  name: string
  artist: string
  playcount: number
  rank: number
}

export interface LastFmLovedTrack {
  name: string
  artist: string
  lovedAt: Date
}

export interface LastFmUserInfo {
  name: string
  playcount: number
  registered: Date
  imageUrl: string
}

function sign(params: Record<string, string>): string {
  const str =
    Object.keys(params)
      .sort()
      .filter((k) => k !== 'format')
      .map((k) => `${k}${params[k]}`)
      .join('') + secret()
  return createHash('md5').update(str).digest('hex')
}

async function call<T>(params: Record<string, string>): Promise<T> {
  const withKey: Record<string, string> = { ...params, api_key: key() }
  if (withKey.sk) withKey.api_sig = sign(withKey)
  const url = new URL(BASE)
  Object.entries({ ...withKey, format: 'json' }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  )
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.message ?? `Last.fm error ${data.error}`)
  return data as T
}

async function paginate<TResponse, TItem>(
  params: Record<string, string>,
  getItems: (d: TResponse) => TItem[],
  getTotal: (d: TResponse) => number,
): Promise<TItem[]> {
  const all: TItem[] = []
  let page = 1
  while (true) {
    const data = await call<TResponse>({ ...params, page: String(page), limit: '200' })
    const items = getItems(data)
    if (items.length === 0) break
    all.push(...items)
    if (all.length >= getTotal(data)) break
    page++
    if (page > 200) break
    await new Promise((r) => setTimeout(r, 250))
  }
  return all
}

export const lastfmClient = {
  async getRecentTracks(username: string, from?: number, sk?: string): Promise<LastFmTrack[]> {
    type R = {
      recenttracks: {
        track: Array<{
          name: string
          artist: { '#text': string }
          album: { '#text': string }
          date?: { uts: string }
          '@attr'?: { nowplaying: string }
        }>
        '@attr': { total: string }
      }
    }
    const p: Record<string, string> = { method: 'user.getrecenttracks', user: username }
    if (from) p.from = String(from)
    if (sk) p.sk = sk
    const items = await paginate<R, R['recenttracks']['track'][0]>(
      p,
      (d) => d.recenttracks.track,
      (d) => Number(d.recenttracks['@attr'].total),
    )
    return items
      .filter((t) => !t['@attr']?.nowplaying)
      .map((t) => ({
        name: t.name,
        artist: t.artist['#text'],
        album: t.album['#text'] || null,
        scrobbledAt: t.date ? new Date(Number(t.date.uts) * 1000) : null,
      }))
  },

  /** Single lightweight `user.getrecenttracks` call used for live polling: the
   * current now-playing track (if any) plus the last `limit` completed scrobbles. */
  async getRecentActivity(username: string, limit = 20): Promise<{
    nowPlaying: { track: string; artist: string; album: string | null } | null
    recent: { artist: string; track: string; album: string | null; scrobbledAt: string }[]
  }> {
    type R = {
      recenttracks: {
        track: Array<{
          name: string
          artist: { '#text': string }
          album?: { '#text': string }
          date?: { uts: string }
          '@attr'?: { nowplaying: string }
        }>
      }
    }
    const data = await call<R>({ method: 'user.getrecenttracks', user: username, limit: String(limit) })
    const tracks = data.recenttracks.track
    if (!Array.isArray(tracks) || tracks.length === 0) return { nowPlaying: null, recent: [] }

    const nowPlayingRaw = tracks.find((t) => t['@attr']?.nowplaying === 'true')
    const nowPlaying = nowPlayingRaw
      ? {
          track: nowPlayingRaw.name,
          artist: nowPlayingRaw.artist['#text'],
          album: nowPlayingRaw.album?.['#text'] || null,
        }
      : null

    const recent = tracks
      .filter((t) => !t['@attr']?.nowplaying && t.date?.uts)
      .map((t) => ({
        artist: t.artist['#text'],
        track: t.name,
        album: t.album?.['#text'] || null,
        scrobbledAt: new Date(Number(t.date!.uts) * 1000).toISOString(),
      }))

    return { nowPlaying, recent }
  },

  async getTopTags(username: string, limit = 50): Promise<{ name: string; count: number; url: string }[]> {
    type R = { toptags: { tag: Array<{ name: string; count: string; url: string }> } }
    const data = await call<R>({ method: 'user.gettoptags', user: username, limit: String(limit) })
    return (data.toptags.tag ?? []).map((t) => ({ name: t.name, count: Number(t.count), url: t.url }))
  },

  async getArtistTopTracks(artist: string, limit = 50): Promise<{ name: string; playcount: number }[]> {
    type R = { toptracks: { track: Array<{ name: string; playcount: string }> } }
    const data = await call<R>({ method: 'artist.gettoptracks', artist, limit: String(limit) })
    return (data.toptracks.track ?? []).map((t) => ({ name: t.name, playcount: Number(t.playcount) }))
  },

  async getTopArtists(username: string, period: Period): Promise<LastFmArtist[]> {
    type R = { topartists: { artist: Array<{ name: string; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettopartists', user: username, period, limit: '50' })
    return data.topartists.artist.map((a) => ({
      name: a.name,
      playcount: Number(a.playcount),
      rank: Number(a['@attr'].rank),
    }))
  },

  async getTopAlbums(username: string, period: Period): Promise<LastFmAlbum[]> {
    type R = { topalbums: { album: Array<{ name: string; artist: { name: string }; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettopalbums', user: username, period, limit: '50' })
    return data.topalbums.album.map((a) => ({
      name: a.name,
      artist: a.artist.name,
      playcount: Number(a.playcount),
      rank: Number(a['@attr'].rank),
    }))
  },

  async getTopTracks(username: string, period: Period): Promise<LastFmTrackTop[]> {
    type R = { toptracks: { track: Array<{ name: string; artist: { name: string }; playcount: string; '@attr': { rank: string } }> } }
    const data = await call<R>({ method: 'user.gettoptracks', user: username, period, limit: '50' })
    return data.toptracks.track.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      playcount: Number(t.playcount),
      rank: Number(t['@attr'].rank),
    }))
  },

  async getLovedTracks(username: string): Promise<LastFmLovedTrack[]> {
    type R = {
      lovedtracks: {
        track: Array<{ name: string; artist: { name: string }; date: { uts: string } }>
        '@attr': { total: string }
      }
    }
    const items = await paginate<R, R['lovedtracks']['track'][0]>(
      { method: 'user.getlovedtracks', user: username },
      (d) => d.lovedtracks.track,
      (d) => Number(d.lovedtracks['@attr'].total),
    )
    return items.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      lovedAt: new Date(Number(t.date.uts) * 1000),
    }))
  },

  async getUserInfo(username: string): Promise<LastFmUserInfo> {
    return getUserInfoCached(username)
  },

  async getSession(token: string): Promise<{ name: string; key: string }> {
    const params = { method: 'auth.getSession', api_key: key(), token }
    const sig = sign(params)
    const url = `${BASE}?method=auth.getSession&api_key=${key()}&token=${token}&api_sig=${sig}&format=json`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(data.message ?? 'Failed to get Last.fm session')
    return { name: data.session.name, key: data.session.key }
  },

  async getFriends(username: string, limit = 10): Promise<{ name: string; imageUrl: string }[]> {
    type R = {
      friends: {
        user: Array<{
          name: string
          image: Array<{ '#text': string; size: string }>
        }>
      }
    }
    const data = await call<R>({ method: 'user.getfriends', user: username, limit: String(limit) })
    const users = data.friends.user
    if (!Array.isArray(users)) return []
    return users.map((u) => {
      const img = u.image.find((i) => i.size === 'large') ?? u.image[u.image.length - 1]
      return { name: u.name, imageUrl: img?.['#text'] ?? '' }
    })
  },

  async getWeeklyArtistChart(username: string): Promise<{ name: string; playcount: number }[]> {
    type R = {
      weeklyartistchart: {
        artist: Array<{ name: string; playcount: string }>
      }
    }
    const data = await call<R>({ method: 'user.getweeklyartistchart', user: username })
    const artists = data.weeklyartistchart.artist
    if (!Array.isArray(artists)) return []
    return artists.map((a) => ({ name: a.name, playcount: Number(a.playcount) }))
  },

  async getFriendRecentTrack(username: string): Promise<{ track: string; artist: string; timestamp: Date | null } | null> {
    type R = {
      recenttracks: {
        track: Array<{
          name: string
          artist: { '#text': string }
          date?: { uts: string }
          '@attr'?: { nowplaying: string }
        }>
      }
    }
    const data = await call<R>({ method: 'user.getrecenttracks', user: username, limit: '1' })
    const tracks = data.recenttracks.track
    if (!Array.isArray(tracks) || tracks.length === 0) return null
    const t = tracks[0]
    return {
      track: t.name,
      artist: t.artist['#text'],
      timestamp: t.date ? new Date(Number(t.date.uts) * 1000) : null,
    }
  },

  async getSimilarArtists(artist: string, limit = 20): Promise<{ name: string; match: number }[]> {
    type R = {
      similarartists: {
        artist: Array<{ name: string; match: string }>
      }
    }
    const data = await call<R>({ method: 'artist.getsimilar', artist, limit: String(limit) })
    const artists = data.similarartists.artist
    if (!Array.isArray(artists)) return []
    return artists.map((a) => ({ name: a.name, match: Number(a.match) }))
  },

  async chartGetTopArtists(limit = 20): Promise<{ name: string; playcount: number; listeners: number }[]> {
    type R = {
      artists: {
        artist: Array<{ name: string; playcount: string; listeners: string }>
      }
    }
    const data = await call<R>({ method: 'chart.gettopartists', limit: String(limit) })
    const artists = data.artists.artist
    if (!Array.isArray(artists)) return []
    return artists.map((a) => ({
      name: a.name,
      playcount: Number(a.playcount),
      listeners: Number(a.listeners),
    }))
  },

  async chartGetTopTracks(limit = 20): Promise<{ name: string; artist: string; playcount: number; listeners: number }[]> {
    type R = {
      tracks: {
        track: Array<{ name: string; artist: { name: string }; playcount: string; listeners: string }>
      }
    }
    const data = await call<R>({ method: 'chart.gettoptracks', limit: String(limit) })
    const tracks = data.tracks.track
    if (!Array.isArray(tracks)) return []
    return tracks.map((t) => ({
      name: t.name,
      artist: t.artist.name,
      playcount: Number(t.playcount),
      listeners: Number(t.listeners),
    }))
  },
}

const getUserInfoCached = cache(async (username: string): Promise<LastFmUserInfo> => {
  type R = {
    user: {
      name: string
      playcount: string
      registered: { unixtime: string }
      image: Array<{ '#text': string; size: string }>
    }
  }
  const data = await call<R>({ method: 'user.getinfo', user: username })
  const img = data.user.image.find((i) => i.size === 'large')
  return {
    name: data.user.name,
    playcount: Number(data.user.playcount),
    registered: new Date(Number(data.user.registered.unixtime) * 1000),
    imageUrl: img?.['#text'] ?? '',
  }
})
