'use client'

import { useState, useEffect } from 'react'
import { WrappedSlide } from '@/components/wrapped-slide'

interface WrappedClientProps {
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
}

const ACCENTS = [
  'oklch(0.2 0 0)',
  'oklch(0.15 0.2 250)',
  'oklch(0.15 0.18 160)',
  'oklch(0.15 0.2 340)',
  'oklch(0.15 0.2 55)',
  'oklch(0.15 0.22 300)',
  'oklch(0.2 0 0)',
]

export function WrappedClient({
  username,
  year,
  totalScrobbles,
  topArtist,
  topTrack,
  nightOwlPct,
  longestStreak,
  totalMinutesEst,
}: WrappedClientProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: `Your ${year} in Music`,
      stat: username,
      subtitle: 'A year of listening',
    },
    {
      title: 'Total Scrobbles',
      stat: totalScrobbles.toLocaleString(),
      subtitle: 'tracks played',
    },
    {
      title: 'Top Artist',
      stat: topArtist?.name ?? '—',
      subtitle: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
    {
      title: 'Anthem',
      stat: topTrack?.name ?? '—',
      subtitle: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
    {
      title: 'Listening Style',
      stat: nightOwlPct > 50 ? 'Night Owl' : 'Day Listener',
      subtitle: `${nightOwlPct}% of plays after 10pm`,
    },
    {
      title: 'Best Streak',
      stat: `${longestStreak} days`,
      subtitle: 'consecutive days of listening',
    },
    {
      title: 'Your Year',
      stat: `${Math.round(totalMinutesEst / 60)} hours`,
      subtitle: `of music in ${year}`,
    },
  ]

  const total = slides.length

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide((prev) => Math.min(prev + 1, total - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [total])

  const slide = slides[currentSlide]

  return (
    <WrappedSlide
      slideNum={currentSlide + 1}
      total={total}
      title={slide.title}
      stat={slide.stat}
      subtitle={slide.subtitle}
      accent={ACCENTS[currentSlide] ?? ACCENTS[0]}
      onPrev={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
      onNext={() => setCurrentSlide((prev) => Math.min(prev + 1, total - 1))}
      isFirst={currentSlide === 0}
      isLast={currentSlide === total - 1}
    />
  )
}
