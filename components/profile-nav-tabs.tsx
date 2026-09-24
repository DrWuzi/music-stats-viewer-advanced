'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, Trophy, Sparkles, FileBarChart, MapPin } from 'lucide-react'

export function ProfileNavTabs({ username }: { username: string }) {
  const pathname = usePathname()
  const base = `/user/${username}`

  const tabs = [
    { href: base, label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: `${base}/history`, label: 'History', icon: <Clock className="h-4 w-4" /> },
    { href: `${base}/achievements`, label: 'Achievements', icon: <Trophy className="h-4 w-4" /> },
    { href: `${base}/wrapped`, label: 'Wrapped', icon: <Sparkles className="h-4 w-4" /> },
    { href: `${base}/reports`, label: 'Reports', icon: <FileBarChart className="h-4 w-4" /> },
    { href: `${base}/concerts`, label: 'Concerts', icon: <MapPin className="h-4 w-4" /> },
  ]

  return (
    // Intentionally Link-based (not the @base-ui/react ARIA Tabs from components/ui/tabs.tsx) since this
    // navigates between real routes/pages rather than switching client-rendered panels — styled to match
    // that component's visual language (indicator style, colors, spacing, transition timing) regardless.
    <nav
      className="flex items-center gap-1 rounded-2xl border border-foreground/10 bg-background/40 p-1 mb-2 overflow-x-auto backdrop-blur-md"
      aria-label="Profile navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.href === base ? pathname === base : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'relative flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 select-none',
              isActive
                ? 'shadow-sm'
                : 'text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground',
            ].join(' ')}
            style={
              isActive
                ? {
                    background: 'color-mix(in oklch, var(--profile-accent, var(--primary)) 16%, var(--background))',
                    color: 'var(--profile-accent, var(--foreground))',
                    borderColor: 'color-mix(in oklch, var(--profile-accent, var(--primary)) 35%, transparent)',
                  }
                : undefined
            }
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
