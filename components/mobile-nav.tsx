'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, Compass, User } from 'lucide-react'

interface MobileNavProps {
  username?: string
}

export function MobileNav({ username }: MobileNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
    },
    {
      label: 'Charts',
      icon: BarChart2,
      href: username ? `/user/${username}` : '/',
    },
    {
      label: 'Discover',
      icon: Compass,
      href: '/',
    },
    {
      label: 'Profile',
      icon: User,
      href: username ? `/user/${username}` : '/',
    },
  ]

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around rounded-2xl border border-foreground/10 bg-background/70 p-1 shadow-lg shadow-black/10 backdrop-blur-xl md:hidden dark:shadow-black/30">
      {tabs.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs transition-colors ${
              isActive ? 'bg-foreground/5 text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
