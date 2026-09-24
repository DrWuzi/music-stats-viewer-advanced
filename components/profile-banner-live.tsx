'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-container'
import { LiveBadge } from '@/components/live-badge'
import { LastActivityNudge } from '@/components/last-activity-nudge'
import { ResyncButton } from '@/components/resync-button'
import { SyncStatus } from '@/components/sync-status'
import { useNowPlaying } from '@/components/now-playing-context'
import {
  PROFILE_THEME_PRESETS,
  PROFILE_THEME_KEYS,
  isValidProfileTheme,
  type ProfileThemeKey,
} from '@/lib/profile-themes'
import {
  AvatarDecoration,
  AvatarDecorationPreview,
  AVATAR_DECORATION_KEYS,
  AVATAR_DECORATION_LABELS,
  isValidAvatarDecoration,
  type AvatarDecorationKey,
} from '@/components/avatar-decorations'
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  PROFILE_BACKGROUND_LABELS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'
import {
  ProfileLoadingAnimationPreview,
  LOADING_ANIMATION_KEYS,
  LOADING_ANIMATION_LABELS,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'
import {
  ProfileHeroEffectLayer,
  ProfileHeroEffectPreview,
  PROFILE_HERO_EFFECT_KEYS,
  PROFILE_HERO_EFFECT_LABELS,
  isValidProfileHeroEffect,
  type ProfileHeroEffectKey,
} from '@/components/profile-hero-effects'

const MAX_TAGLINE_LENGTH = 60
const TAGLINE_DEBOUNCE_MS = 500

interface ProfileBannerLiveProps {
  username: string
  imageUrl: string
  totalScrobbles: number
  registeredAt: Date
  years: number
  isOwner: boolean
  lastSyncedAt: Date | null
  initialTheme: string | null
  initialTagline: string | null
  initialAvatarDecoration: string | null
  initialBackground: string | null
  initialLoadingAnimation: string | null
  initialHeroEffect: string | null
  /** Top overall artist (server-fetched) — fallback hero backdrop image when nothing is currently playing. */
  topArtistName: string | null
}

// Module-level cache: the hero backdrop reuses the same artist-image lookup
// as components/artist-image.tsx (and its `/api/artist-image` route, which
// already caches server-side), this just avoids refetching within a session
// when navigating between a profile's tabs re-mounts the banner.
const backdropImageCache = new Map<string, string | null>()

async function fetchBackdropImage(name: string): Promise<string | null> {
  const res = await fetch(`/api/artist-image?name=${encodeURIComponent(name)}`)
  const data = await res.json()
  return data.url ?? null
}

export function ProfileBannerLive({
  username,
  imageUrl,
  totalScrobbles,
  registeredAt,
  years,
  isOwner,
  lastSyncedAt,
  initialTheme,
  initialTagline,
  initialAvatarDecoration,
  initialBackground,
  initialLoadingAnimation,
  initialHeroEffect,
  topArtistName,
}: ProfileBannerLiveProps) {
  const { data: nowPlaying } = useNowPlaying()
  const backdropArtistName = nowPlaying?.nowPlaying && nowPlaying.artist ? nowPlaying.artist : topArtistName
  const [backdropImage, setBackdropImage] = useState<string | null>(
    backdropArtistName ? backdropImageCache.get(backdropArtistName) ?? null : null,
  )

  useEffect(() => {
    if (!backdropArtistName) {
      setBackdropImage(null)
      return
    }
    const cached = backdropImageCache.get(backdropArtistName)
    if (cached !== undefined) {
      setBackdropImage(cached)
      return
    }
    let cancelled = false
    fetchBackdropImage(backdropArtistName).then((url) => {
      backdropImageCache.set(backdropArtistName, url)
      if (!cancelled) setBackdropImage(url)
    })
    return () => {
      cancelled = true
    }
  }, [backdropArtistName])

  const [theme, setTheme] = useState<ProfileThemeKey>(
    isValidProfileTheme(initialTheme) ? initialTheme : 'default',
  )
  const [tagline, setTagline] = useState(initialTagline ?? '')
  const [decoration, setDecoration] = useState<AvatarDecorationKey>(
    isValidAvatarDecoration(initialAvatarDecoration) ? initialAvatarDecoration : 'none',
  )
  const [background, setBackground] = useState<ProfileBackgroundKey>(
    isValidProfileBackground(initialBackground) ? initialBackground : 'none',
  )
  const [loadingAnimation, setLoadingAnimation] = useState<LoadingAnimationKey>(
    isValidLoadingAnimation(initialLoadingAnimation) ? initialLoadingAnimation : 'none',
  )
  const [heroEffect, setHeroEffect] = useState<ProfileHeroEffectKey>(
    isValidProfileHeroEffect(initialHeroEffect) ? initialHeroEffect : 'none',
  )
  const [editing, setEditing] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editing) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function flash(msg: string, ms = 2000) {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(null), ms)
  }

  async function persist(payload: {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
    loadingAnimation?: string
    heroEffect?: string
  }) {
    try {
      const res = await fetch('/api/profile-customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('failed')
      flash('Saved')
    } catch {
      flash('Failed to save')
    }
  }

  function handleThemeSelect(key: ProfileThemeKey) {
    setTheme(key)
    persist({ profileTheme: key })
  }

  function handleDecorationSelect(key: AvatarDecorationKey) {
    setDecoration(key)
    persist({ avatarDecoration: key })
  }

  function handleBackgroundSelect(key: ProfileBackgroundKey) {
    setBackground(key)
    persist({ profileBackground: key })
  }

  function handleLoadingAnimationSelect(key: LoadingAnimationKey) {
    setLoadingAnimation(key)
    persist({ loadingAnimation: key })
  }

  function handleHeroEffectSelect(key: ProfileHeroEffectKey) {
    setHeroEffect(key)
    persist({ heroEffect: key })
  }

  function handleTaglineChange(value: string) {
    const clamped = value.slice(0, MAX_TAGLINE_LENGTH)
    setTagline(clamped)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist({ profileTagline: clamped }), TAGLINE_DEBOUNCE_MS)
  }

  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTheme('default')
    setTagline('')
    setDecoration('none')
    setBackground('none')
    setLoadingAnimation('none')
    setHeroEffect('none')
    persist({
      profileTheme: 'default',
      profileTagline: '',
      avatarDecoration: 'none',
      profileBackground: 'none',
      loadingAnimation: 'none',
      heroEffect: 'none',
    })
  }

  const preset = PROFILE_THEME_PRESETS[theme]
  const hasAccent = preset.accent.light !== null

  return (
    <>
      <ProfileBackgroundLayer pattern={background} />

      {/* This <style> tag's selector applies to the ancestor .profile-theme-scope
          element regardless of where this component sits in the tree — CSS
          custom properties then cascade to every descendant (banner, tabs,
          and the sub-page widgets rendered as {children} in the layout). */}
      {hasAccent && (
        <style>{`
          .profile-theme-scope {
            --profile-accent: ${preset.accent.light};
            --profile-accent-foreground: ${preset.accent.lightForeground};
          }
          .dark .profile-theme-scope {
            --profile-accent: ${preset.accent.dark};
            --profile-accent-foreground: ${preset.accent.darkForeground};
          }
        `}</style>
      )}

      {/* Contained like every other surface in the app (nav, cards) — not a
          full-bleed strip, so it reads as part of the same floating-glass
          layout instead of breaking out of it. */}
      <PageContainer className="pt-3">
      <div className="relative rounded-3xl border border-foreground/10 shadow-xl shadow-black/10 dark:shadow-black/40">
        {/* overflow-hidden lives on this background-only layer (not the outer
            hero div) so it clips the backdrop art/effects to the rounded
            corners without also clipping the edit popover panel below, which
            needs to render outside the hero's bounds. */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {/* Hero backdrop art: now-playing artist takes priority over the top
            overall artist (see the useNowPlaying()-driven effect above); falls
            back to an accent-tinted gradient when no image resolves. Heavy
            blur for a frosted-glass look — scale bumped well past 100% so the
            blur (which samples "beyond" the element as transparent) never
            reveals a dim edge inside the rounded corners. */}
        {backdropImage ? (
          <div
            aria-hidden
            className="absolute inset-0 scale-125 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${backdropImage})` }}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: hasAccent
                ? 'radial-gradient(circle at 20% 30%, color-mix(in oklch, var(--profile-accent) 35%, transparent), transparent 65%)'
                : 'radial-gradient(circle at 20% 30%, var(--chart-1), transparent 65%)',
            }}
          />
        )}

        {/* Frost tint — a translucent card-colored layer over the blurred art,
            reinforcing the glass-panel look instead of reading as a photo. */}
        {backdropImage && <div aria-hidden className="absolute inset-0 bg-card/25 backdrop-saturate-150" />}

        {/* Subtle dot-grid texture over whichever backdrop is active */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Even scrim for legibility, plus extra darkening toward the bottom
            where the text/actions row sits. */}
        <div aria-hidden className="absolute inset-0 bg-black/35" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
          }}
        />

        {/* User-selectable animated overlay (like Discord's profile effects) — above the art/scrim, below the text. */}
        <ProfileHeroEffectLayer effect={heroEffect} />
        </div>

        <div className="relative flex items-end gap-4 flex-wrap sm:flex-nowrap p-5 sm:p-7">
        <div className="relative shrink-0 h-20 w-20">
          <Avatar
            className="h-20 w-20 ring-[3px] ring-offset-2 relative"
            style={
              {
                '--tw-ring-color': hasAccent
                  ? 'var(--profile-accent)'
                  : 'color-mix(in oklch, var(--primary) 20%, transparent)',
                boxShadow: hasAccent
                  ? '0 0 18px color-mix(in oklch, var(--profile-accent) 55%, transparent)'
                  : '0 4px 24px rgba(0,0,0,0.35)',
              } as React.CSSProperties
            }
          >
            <AvatarImage src={imageUrl} alt={username} />
            <AvatarFallback>{username[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <AvatarDecoration decoration={decoration} className="-inset-2.5" />
        </div>

        <div className="flex-1 min-w-0 relative [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
          <h1
            className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent flex items-center flex-wrap gap-x-1"
            style={{
              backgroundImage: hasAccent
                ? 'linear-gradient(90deg, var(--profile-accent), var(--foreground))'
                : 'linear-gradient(90deg, white, rgba(255,255,255,0.75))',
              textShadow: '0 2px 16px rgba(0,0,0,0.5)',
            }}
          >
            {username}
            <LiveBadge />
          </h1>
          <p className="text-white/85 text-sm">
            {totalScrobbles.toLocaleString('en-US')} scrobbles · Member since{' '}
            {new Date(registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
          {tagline && <p className="text-sm mt-0.5 truncate font-medium text-white">{tagline}</p>}
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            {years > 0 && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm"
                style={
                  hasAccent
                    ? { background: 'var(--profile-accent)', color: 'var(--profile-accent-foreground)' }
                    : {
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }
                }
              >
                {years} {years === 1 ? 'year' : 'years'} as a member
              </span>
            )}
            {backdropImage && backdropArtistName && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 text-xs text-white/80 backdrop-blur-sm"
                title={`Hero backdrop: ${backdropArtistName}`}
              >
                <ImageIcon className="h-3 w-3" />
                {nowPlaying?.nowPlaying ? 'Now playing' : 'Top artist'}: {backdropArtistName}
              </span>
            )}
          </div>
          <LastActivityNudge lastSyncedAt={lastSyncedAt} className="text-white/70" />
        </div>

        <div className="flex items-center gap-2 shrink-0 relative print:hidden">
          {isOwner && <ResyncButton username={username} />}
          <SyncStatus lastSyncedAt={lastSyncedAt} isOwner={isOwner} />

          {isOwner && (
            <div className="relative" ref={panelRef}>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                aria-label="Edit profile appearance"
                title="Edit profile appearance"
                className="h-8 w-8 rounded-full border border-white/20 bg-black/25 backdrop-blur-md flex items-center justify-center transition-colors hover:bg-black/40"
                style={{
                  borderColor: hasAccent ? 'var(--profile-accent)' : undefined,
                  color: hasAccent ? 'var(--profile-accent)' : 'white',
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              {editing && (
                <div
                  className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-foreground/10 bg-popover/90 shadow-2xl backdrop-blur-xl p-4 space-y-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Customize your profile</p>
                    <button
                      onClick={() => setEditing(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {savedMsg && (
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{savedMsg}</p>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Accent theme</p>
                    <div className="flex flex-wrap gap-2.5">
                      {PROFILE_THEME_KEYS.map((key) => {
                        const p = PROFILE_THEME_PRESETS[key]
                        const isSelected = theme === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleThemeSelect(key)}
                            aria-pressed={isSelected}
                            aria-label={p.label}
                            title={p.label}
                            className="h-7 w-7 rounded-full border-2 transition-all shrink-0"
                            style={{
                              backgroundColor: p.accent.light ?? 'var(--muted)',
                              borderColor: isSelected ? 'var(--foreground)' : 'var(--border)',
                              boxShadow: isSelected ? '0 0 0 2px var(--card), 0 0 0 4px var(--foreground)' : 'none',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Avatar decoration</p>
                    <div className="grid grid-cols-5 gap-2">
                      {AVATAR_DECORATION_KEYS.map((key) => {
                        const isSelected = decoration === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleDecorationSelect(key)}
                            aria-pressed={isSelected}
                            title={AVATAR_DECORATION_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <AvatarDecorationPreview decoration={key} size={32} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Background</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PROFILE_BACKGROUND_KEYS.map((key) => {
                        const isSelected = background === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleBackgroundSelect(key)}
                            aria-pressed={isSelected}
                            title={PROFILE_BACKGROUND_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileBackgroundPreview pattern={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Loading animation</p>
                    <div className="grid grid-cols-4 gap-2">
                      {LOADING_ANIMATION_KEYS.map((key) => {
                        const isSelected = loadingAnimation === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleLoadingAnimationSelect(key)}
                            aria-pressed={isSelected}
                            title={LOADING_ANIMATION_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileLoadingAnimationPreview preset={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Profile animation</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PROFILE_HERO_EFFECT_KEYS.map((key) => {
                        const isSelected = heroEffect === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleHeroEffectSelect(key)}
                            aria-pressed={isSelected}
                            title={PROFILE_HERO_EFFECT_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileHeroEffectPreview effect={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Tagline</p>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => handleTaglineChange(e.target.value)}
                      maxLength={MAX_TAGLINE_LENGTH}
                      placeholder="e.g. Vinyl collector & shoegaze enthusiast"
                      className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                    <p className="text-[0.7rem] text-right" style={{ color: 'var(--muted-foreground)' }}>
                      {tagline.length}/{MAX_TAGLINE_LENGTH}
                    </p>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Reset to default
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
      </PageContainer>
    </>
  )
}
