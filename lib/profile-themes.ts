/**
 * Profile theme presets.
 *
 * The site's default look is a chroma-0 grayscale theme (see app/globals.css
 * --primary tokens). Profile themes are deliberately NOT tied to --primary's
 * lightness anymore — early versions matched --primary's L (0.205 light /
 * 0.922 dark), which is nearly black/white, so the chroma barely showed at
 * all. These presets use genuinely mid-range lightness + real chroma so the
 * accent reads as an actual, obvious color choice.
 */

export type ProfileThemeKey =
  | 'default'
  | 'crimson'
  | 'amber'
  | 'emerald'
  | 'azure'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'catppuccin'
  | 'rosepine'
  | 'dracula'

export interface ProfileThemeColors {
  /** oklch(...) string for the accent in light mode, or null for 'default' (no override) */
  light: string | null
  /** oklch(...) string for the accent in dark mode, or null for 'default' (no override) */
  dark: string | null
  /** oklch(...) string for text/icons rendered on top of the light-mode accent, or null for 'default' */
  lightForeground: string | null
  /** oklch(...) string for text/icons rendered on top of the dark-mode accent, or null for 'default' */
  darkForeground: string | null
}

export interface ProfileThemePreset {
  key: ProfileThemeKey
  label: string
  accent: ProfileThemeColors
}

export const PROFILE_THEME_PRESETS: Record<ProfileThemeKey, ProfileThemePreset> = {
  default: {
    key: 'default',
    label: 'Default',
    accent: { light: null, dark: null, lightForeground: null, darkForeground: null },
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson',
    accent: {
      light: 'oklch(0.55 0.22 25)',
      dark: 'oklch(0.65 0.20 25)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.98 0 0)',
    },
  },
  amber: {
    key: 'amber',
    label: 'Amber',
    accent: {
      light: 'oklch(0.75 0.17 80)',
      dark: 'oklch(0.80 0.16 80)',
      lightForeground: 'oklch(0.25 0.05 80)',
      darkForeground: 'oklch(0.2 0.04 80)',
    },
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    accent: {
      light: 'oklch(0.58 0.15 155)',
      dark: 'oklch(0.68 0.16 155)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.15 0.02 155)',
    },
  },
  azure: {
    key: 'azure',
    label: 'Azure',
    accent: {
      light: 'oklch(0.55 0.18 235)',
      dark: 'oklch(0.68 0.16 235)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.98 0 0)',
    },
  },
  violet: {
    key: 'violet',
    label: 'Violet',
    accent: {
      light: 'oklch(0.55 0.22 300)',
      dark: 'oklch(0.68 0.20 300)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.98 0 0)',
    },
  },
  rose: {
    key: 'rose',
    label: 'Rose',
    accent: {
      light: 'oklch(0.60 0.20 355)',
      dark: 'oklch(0.70 0.18 355)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.98 0 0)',
    },
  },
  cyan: {
    key: 'cyan',
    label: 'Cyan',
    accent: {
      light: 'oklch(0.62 0.14 200)',
      dark: 'oklch(0.72 0.14 200)',
      lightForeground: 'oklch(0.15 0.02 200)',
      darkForeground: 'oklch(0.15 0.02 200)',
    },
  },
  // Named palettes below use their real signature accent color, converted
  // from the official hex swatches to oklch (light = the palette's own light
  // variant where one exists, dark = its native/main variant).
  catppuccin: {
    key: 'catppuccin',
    label: 'Catppuccin',
    accent: {
      // Latte mauve #8839ef
      light: 'oklch(0.555 0.25 297)',
      // Mocha mauve #cba6f7
      dark: 'oklch(0.787 0.119 305)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.18 0.02 305)',
    },
  },
  rosepine: {
    key: 'rosepine',
    label: 'Rosé Pine',
    accent: {
      // Dawn iris #907aa9
      light: 'oklch(0.617 0.074 306)',
      // Main iris #c4a7e7
      dark: 'oklch(0.776 0.095 305)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.18 0.02 305)',
    },
  },
  dracula: {
    key: 'dracula',
    label: 'Dracula',
    accent: {
      // Dracula has no official light variant — this is a deepened version of
      // its signature purple (#bd93f9) for legibility on light backgrounds.
      light: 'oklch(0.50 0.20 302)',
      // Native Dracula purple #bd93f9
      dark: 'oklch(0.742 0.149 302)',
      lightForeground: 'oklch(0.98 0 0)',
      darkForeground: 'oklch(0.18 0.02 302)',
    },
  },
}

export const PROFILE_THEME_KEYS = Object.keys(PROFILE_THEME_PRESETS) as ProfileThemeKey[]

export function isValidProfileTheme(value: unknown): value is ProfileThemeKey {
  return typeof value === 'string' && (PROFILE_THEME_KEYS as string[]).includes(value)
}
