export function artistHref(name: string, username?: string): string {
  return `/artist/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function albumHref(artist: string, name: string, username?: string): string {
  return `/album/${encodeURIComponent(artist)}/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function trackHref(artist: string, name: string, username?: string): string {
  return `/track/${encodeURIComponent(artist)}/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function genreHref(name: string): string {
  return `/genre/${encodeURIComponent(name)}`
}
