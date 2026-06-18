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
    <nav className="fixed bottom-0 left-0 right-0 flex bg-background/95 backdrop-blur border-t border-border md:hidden z-50">
      {tabs.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={label}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 gap-1 text-xs transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
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
