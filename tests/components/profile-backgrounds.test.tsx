import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'

describe('isValidProfileBackground', () => {
  it('accepts every known key', () => {
    for (const key of PROFILE_BACKGROUND_KEYS) {
      expect(isValidProfileBackground(key)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isValidProfileBackground('not-a-real-pattern')).toBe(false)
    expect(isValidProfileBackground(null)).toBe(false)
    expect(isValidProfileBackground(undefined)).toBe(false)
    expect(isValidProfileBackground(42)).toBe(false)
  })
})

describe('ProfileBackgroundLayer', () => {
  it('renders nothing for "none"', () => {
    const { container } = render(<ProfileBackgroundLayer pattern="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a layer with the profile-bg-layer class for every non-none pattern', () => {
    const patterns = PROFILE_BACKGROUND_KEYS.filter(
      (k): k is Exclude<ProfileBackgroundKey, 'none'> => k !== 'none',
    )
    for (const pattern of patterns) {
      const { container } = render(<ProfileBackgroundLayer pattern={pattern} />)
      expect(container.querySelector('.profile-bg-layer')).not.toBeNull()
    }
  })
})

describe('ProfileBackgroundPreview', () => {
  it('renders something for every pattern including none', () => {
    for (const pattern of PROFILE_BACKGROUND_KEYS) {
      const { container } = render(<ProfileBackgroundPreview pattern={pattern} />)
      expect(container.firstChild).not.toBeNull()
    }
  })
})
