'use client'

import { useEffect, useState } from 'react'
import { Cat, Flower2, Ghost, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ThemeMode = 'light' | 'dark' | 'rosepine' | 'catppuccin' | 'dracula'

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'rosepine', 'catppuccin', 'dracula']
const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  rosepine: 'Rosé Pine',
  catppuccin: 'Catppuccin',
  dracula: 'Dracula',
}

function readTheme(): ThemeMode {
  const stored = localStorage.getItem('theme')
  return (THEME_MODES as readonly string[]).includes(stored ?? '') ? (stored as ThemeMode) : 'light'
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark', 'theme-rosepine', 'theme-catppuccin', 'theme-dracula')

  if (mode === 'dark') {
    root.classList.add('dark')
  } else if (mode === 'rosepine') {
    root.classList.add('dark', 'theme-rosepine')
  } else if (mode === 'catppuccin') {
    root.classList.add('dark', 'theme-catppuccin')
  } else if (mode === 'dracula') {
    root.classList.add('dark', 'theme-dracula')
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    const sync = () => {
      const next = readTheme()
      applyTheme(next)
      setMode(next)
    }

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('themechange', sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('themechange', sync as EventListener)
    }
  }, [])

  function cycleTheme() {
    const currentIndex = THEME_MODES.indexOf(mode)
    const next = THEME_MODES[(currentIndex + 1) % THEME_MODES.length]
    localStorage.setItem('theme', next)
    applyTheme(next)
    setMode(next)
    window.dispatchEvent(new Event('themechange'))
  }

  const icon = (() => {
    if (mode === 'dark') return <Sun className="h-4 w-4" />
    if (mode === 'rosepine') return <Flower2 className="h-4 w-4" />
    if (mode === 'catppuccin') return <Cat className="h-4 w-4" />
    if (mode === 'dracula') return <Ghost className="h-4 w-4" />
    return <Moon className="h-4 w-4" />
  })()

  const nextMode = THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]

  function toggle() {
    cycleTheme()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Theme: ${THEME_LABELS[mode]}. Next: ${THEME_LABELS[nextMode]}`}
      title={`Theme: ${THEME_LABELS[mode]}`}
    >
      {icon}
    </Button>
  )
}
