import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  ProfileLoadingAnimation,
  ProfileLoadingAnimationPreview,
  LOADING_ANIMATION_KEYS,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'

describe('isValidLoadingAnimation', () => {
  it('accepts every known key', () => {
    for (const key of LOADING_ANIMATION_KEYS) {
      expect(isValidLoadingAnimation(key)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isValidLoadingAnimation('not-a-real-preset')).toBe(false)
    expect(isValidLoadingAnimation(null)).toBe(false)
    expect(isValidLoadingAnimation(undefined)).toBe(false)
    expect(isValidLoadingAnimation(42)).toBe(false)
  })
})

describe('ProfileLoadingAnimation', () => {
  it('renders nothing for "none"', () => {
    const { container } = render(<ProfileLoadingAnimation preset="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a status region for every non-none preset', () => {
    const presets = LOADING_ANIMATION_KEYS.filter(
      (k): k is Exclude<LoadingAnimationKey, 'none'> => k !== 'none',
    )
    for (const preset of presets) {
      const { container } = render(<ProfileLoadingAnimation preset={preset} />)
      expect(container.querySelector('[role="status"]')).not.toBeNull()
    }
  })
})

describe('ProfileLoadingAnimationPreview', () => {
  it('renders something for every preset including none', () => {
    for (const preset of LOADING_ANIMATION_KEYS) {
      const { container } = render(<ProfileLoadingAnimationPreview preset={preset} />)
      expect(container.firstChild).not.toBeNull()
    }
  })
})
