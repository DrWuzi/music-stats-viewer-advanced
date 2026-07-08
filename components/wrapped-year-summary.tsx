'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Music2,
  Mic2,
  Disc3,
  BarChart3,
  Flame,
  Calendar,
  Clock,
  TrendingUp,
  Star,
  Share2,
  ChevronLeft,
  ChevronRight,
  Play,
  Headphones,
} from 'lucide-react'
import { artistHref, trackHref } from '@/lib/urls'

export interface WrappedYearData {
  username: string
  year: number
  totalScrobbles: number
  uniqueArtists: number
  uniqueTracks: number
  topArtist: { name: string; playcount: number } | null
  topTrack: { name: string; artist: string; playcount: number } | null
  topAlbum: { name: string; artist: string; playcount: number } | null
  longestStreak: number
  nightOwlPct: number
  weekendPct: number
  totalMinutesEst: number
  peakDay: { date: string; count: number } | null
  mostActiveMonth: { month: string; count: number } | null
  favoriteHour: number | null
  firstScrobble: { track: string; artist: string; date: string } | null
  lastScrobble: { track: string; artist: string; date: string } | null
  yearRange: number[]
}

function useAnimatedNumber(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let start: number | null = null
    const timeout = setTimeout(() => {
      function step(ts: number) {
        if (start === null) start = ts
        const elapsed = ts - start
        const progress = Math.min(elapsed / duration, 1)
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return value
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const animated = useAnimatedNumber(value, 1400, delay)
  return <span>{animated.toLocaleString()}</span>
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
  delay?: number
  accent?: string
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <Card
      className="relative overflow-hidden border-0 shadow-lg"
      style={accent ? { background: accent } : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 rounded-xl p-2.5 shrink-0"
            style={{
              background: accent
                ? 'color-mix(in oklch, white 15%, transparent)'
                : 'color-mix(in oklch, var(--primary) 12%, transparent)',
              color: accent ? 'white' : 'var(--primary)',
            }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: accent ? 'color-mix(in oklch, white 70%, transparent)' : 'var(--muted-foreground)' }}
            >
              {label}
            </p>
            <div
              className="text-2xl font-bold leading-tight break-words"
              style={{ color: accent ? 'white' : 'var(--foreground)' }}
            >
              {value}
            </div>
            {sub && (
              <p
                className="text-sm mt-1 truncate"
                style={{ color: accent ? 'color-mix(in oklch, white 75%, transparent)' : 'var(--muted-foreground)' }}
              >
                {sub}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WrappedYearSummary({
  username,
  year,
  totalScrobbles,
  uniqueArtists,
  uniqueTracks,
  topArtist,
  topTrack,
  topAlbum,
  longestStreak,
  nightOwlPct,
  totalMinutesEst,
  peakDay,
  mostActiveMonth,
  favoriteHour,
  firstScrobble,
  lastScrobble,
  yearRange,
}: WrappedYearData) {
  const [shared, setShared] = useState(false)
  const [slideMode, setSlideMode] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const totalHours = Math.round(totalMinutesEst / 60)

  async function handleShare() {
    const url = window.location.href
    const text = `My ${year} in music: ${totalScrobbles.toLocaleString()} scrobbles, top artist ${topArtist?.name ?? '?'}. Check it out!`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${username}'s ${year} Wrapped`, text, url })
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  const slides = [
    {
      bg: 'oklch(0.18 0.22 280)',
      icon: <Headphones className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: `${username}'s ${year}`,
      stat: 'Year in Music',
      sub: 'Scroll down to explore your stats',
    },
    {
      bg: 'oklch(0.15 0.22 250)',
      icon: <BarChart3 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Total Scrobbles',
      stat: totalScrobbles.toLocaleString(),
      sub: `${totalHours.toLocaleString()} hours of music`,
    },
    {
      bg: 'oklch(0.15 0.2 160)',
      icon: <Mic2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Top Artist',
      stat: topArtist ? (
        <Link
          href={artistHref(topArtist.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topArtist.name}
        </Link>
      ) : (
        '—'
      ),
      sub: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
    {
      bg: 'oklch(0.15 0.2 340)',
      icon: <Music2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Anthem',
      stat: topTrack ? (
        <Link
          href={trackHref(topTrack.artist, topTrack.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topTrack.name}
        </Link>
      ) : (
        '—'
      ),
      sub: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
    {
      bg: 'oklch(0.15 0.22 55)',
      icon: <Disc3 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Favourite Album',
      stat: topAlbum?.name ?? '—',
      sub: topAlbum ? `by ${topAlbum.artist}` : 'No data',
    },
    {
      bg: 'oklch(0.15 0.22 10)',
      icon: <Flame className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Longest Streak',
      stat: `${longestStreak} days`,
      sub: 'consecutive days of listening',
    },
    {
      bg: 'oklch(0.15 0.2 120)',
      icon: <Star className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Peak Day',
      stat: peakDay ? peakDay.count.toLocaleString() : '—',
      sub: peakDay ? `scrobbles on ${formatDate(peakDay.date)}` : 'No data',
    },
    {
      bg: 'oklch(0.15 0.18 200)',
      icon: <Clock className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Peak Hour',
      stat: favoriteHour !== null ? formatHour(favoriteHour) : '—',
      sub: 'your most active time of day',
    },
    {
      bg: 'oklch(0.15 0.2 300)',
      icon: <TrendingUp className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Best Month',
      stat: mostActiveMonth?.month ?? '—',
      sub: mostActiveMonth ? `${mostActiveMonth.count.toLocaleString()} scrobbles` : 'No data',
    },
    {
      bg: 'oklch(0.15 0.24 260)',
      icon: <Play className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Your Year',
      stat: `${uniqueArtists.toLocaleString()} artists`,
      sub: `${uniqueTracks.toLocaleString()} unique tracks`,
    },
  ]

  useEffect(() => {
    if (!slideMode) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide((p) => Math.min(p + 1, slides.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide((p) => Math.max(p - 1, 0))
      } else if (e.key === 'Escape') {
        setSlideMode(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [slideMode, slides.length])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-2"
          style={{
            background: 'color-mix(in oklch, var(--primary) 15%, transparent)',
            color: 'var(--primary)',
          }}
        >
          <Headphones className="w-4 h-4" />
          Year in Review
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
          {year}
        </h1>
        <p className="text-xl font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {username}&apos;s music story
        </p>
      </div>

      {/* Year selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {yearRange.map((y) => (
          <Link key={y} href={`/user/${username}/wrapped?year=${y}`}>
            <Badge
              variant={y === year ? 'default' : 'outline'}
              className="cursor-pointer text-sm px-3 py-1 transition-all hover:scale-105"
            >
              {y}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          onClick={handleShare}
          className="gap-2"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <Share2 className="w-4 h-4" />
          {shared ? 'Copied to clipboard!' : 'Share'}
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => { setSlideMode(true); setCurrentSlide(0) }}
        >
          <Play className="w-4 h-4" />
          Slideshow
        </Button>
      </div>

      {/* Hero stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="border-0 shadow-xl sm:col-span-3 overflow-hidden"
          style={{ background: 'oklch(0.18 0.22 280)' }}
        >
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Total Scrobbles
                </p>
                <p className="text-5xl font-black" style={{ color: 'white' }}>
                  <AnimatedNumber value={totalScrobbles} delay={100} />
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Hours of Music
                </p>
                <p className="text-5xl font-black" style={{ color: 'white' }}>
                  <AnimatedNumber value={totalHours} delay={200} />
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Unique Artists
                </p>
                <p className="text-5xl font-black" style={{ color: 'white' }}>
                  <AnimatedNumber value={uniqueArtists} delay={300} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Mic2 className="w-5 h-5" />}
          label="Top Artist"
          value={
            topArtist ? (
              <Link
                href={artistHref(topArtist.name, username)}
                className="hover:underline hover:text-primary transition-colors"
              >
                {topArtist.name}
              </Link>
            ) : (
              '—'
            )
          }
          sub={topArtist ? `${topArtist.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 160)"
        />
        <StatCard
          icon={<Music2 className="w-5 h-5" />}
          label="Anthem"
          value={
            topTrack ? (
              <Link
                href={trackHref(topTrack.artist, topTrack.name, username)}
                className="hover:underline hover:text-primary transition-colors"
              >
                {topTrack.name}
              </Link>
            ) : (
              '—'
            )
          }
          sub={topTrack ? `by ${topTrack.artist} · ${topTrack.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 340)"
        />
        <StatCard
          icon={<Disc3 className="w-5 h-5" />}
          label="Favourite Album"
          value={topAlbum?.name ?? '—'}
          sub={topAlbum ? `by ${topAlbum.artist}` : undefined}
          accent="oklch(0.15 0.22 55)"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Longest Streak"
          value={
            <span>
              <AnimatedNumber value={longestStreak} delay={400} />{' '}
              <span className="text-lg font-semibold">days</span>
            </span>
          }
          sub="consecutive days of listening"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Peak Day"
          value={
            peakDay ? (
              <span>
                <AnimatedNumber value={peakDay.count} delay={500} />{' '}
                <span className="text-lg font-semibold">plays</span>
              </span>
            ) : '—'
          }
          sub={peakDay ? formatDate(peakDay.date) : undefined}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Best Month"
          value={mostActiveMonth?.month ?? '—'}
          sub={mostActiveMonth ? `${mostActiveMonth.count.toLocaleString()} scrobbles` : undefined}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Peak Listening Hour"
          value={favoriteHour !== null ? formatHour(favoriteHour) : '—'}
          sub="most active time of day"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Unique Tracks"
          value={<AnimatedNumber value={uniqueTracks} delay={600} />}
          sub="different songs played"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Listening Style"
          value={nightOwlPct > 50 ? 'Night Owl' : 'Day Listener'}
          sub={`${nightOwlPct}% of plays after 10 PM`}
        />
      </div>

      {/* First & last scrobble */}
      {(firstScrobble || lastScrobble) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {firstScrobble && (
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  >
                    <Play className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                    First Scrobble of {year}
                  </p>
                </div>
                <p className="font-bold text-lg leading-tight truncate" style={{ color: 'var(--foreground)' }}>
                  {firstScrobble.track}
                </p>
                <p className="text-sm truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {firstScrobble.artist}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  {firstScrobble.date}
                </p>
              </CardContent>
            </Card>
          )}
          {lastScrobble && (
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  >
                    <Music2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                    Last Scrobble of {year}
                  </p>
                </div>
                <p className="font-bold text-lg leading-tight truncate" style={{ color: 'var(--foreground)' }}>
                  {lastScrobble.track}
                </p>
                <p className="text-sm truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {lastScrobble.artist}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  {lastScrobble.date}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Slideshow overlay */}
      {slideMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSlideMode(false) }}
        >
          <div className="w-full max-w-lg px-4 flex flex-col items-center gap-6">
            {/* Close */}
            <button
              className="self-end text-white/60 hover:text-white text-sm"
              onClick={() => setSlideMode(false)}
            >
              ESC to close
            </button>

            {/* Slide card */}
            <div
              className="w-full rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: slides[currentSlide].bg }}
            >
              <div className="p-12 flex flex-col items-center justify-center min-h-[420px] text-center space-y-6">
                <div style={{ opacity: 0.85 }}>{slides[currentSlide].icon}</div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-[0.25em] mb-4"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {slides[currentSlide].label}
                  </p>
                  <p
                    className="text-5xl font-black leading-tight break-words"
                    style={{ color: 'white' }}
                  >
                    {slides[currentSlide].stat}
                  </p>
                  <p className="text-base mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {slides[currentSlide].sub}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlide((p) => Math.max(p - 1, 0))}
                disabled={currentSlide === 0}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-white/60 text-sm tabular-nums w-16 text-center">
                {currentSlide + 1} / {slides.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlide((p) => Math.min(p + 1, slides.length - 1))}
                disabled={currentSlide === slides.length - 1}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentSlide ? '20px' : '8px',
                    height: '8px',
                    background: i === currentSlide ? 'white' : 'rgba(255,255,255,0.3)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
