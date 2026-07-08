import { describe, it, expect } from 'vitest'
import { artistHref, albumHref, trackHref, genreHref } from '@/lib/urls'

describe('lib/urls', () => {
  it('artistHref builds a path without username', () => {
    expect(artistHref('Radiohead')).toBe('/artist/Radiohead')
  })

  it('artistHref appends an encoded username', () => {
    expect(artistHref('Radiohead', 'test user')).toBe('/artist/Radiohead?username=test%20user')
  })

  it('artistHref encodes special characters in the name', () => {
    expect(artistHref('AC/DC')).toBe('/artist/AC%2FDC')
  })

  it('albumHref builds a path with artist and album segments', () => {
    expect(albumHref('Radiohead', 'OK Computer', 'user')).toBe('/album/Radiohead/OK%20Computer?username=user')
  })

  it('albumHref omits the username query param when absent', () => {
    expect(albumHref('Radiohead', 'OK Computer')).toBe('/album/Radiohead/OK%20Computer')
  })

  it('trackHref builds a path with artist and track segments', () => {
    expect(trackHref('Radiohead', 'Karma Police', 'user')).toBe('/track/Radiohead/Karma%20Police?username=user')
  })

  it('genreHref builds a path from a genre name', () => {
    expect(genreHref('post-rock')).toBe('/genre/post-rock')
  })
})
