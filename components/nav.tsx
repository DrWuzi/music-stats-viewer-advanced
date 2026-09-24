"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Search,
  Menu,
  X,
  TrendingUp,
  Compass,
  Keyboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavSearch } from "@/components/nav-search"
import { NotificationsButton } from "@/components/notifications-panel"
import { HeaderMoreMenu } from "@/components/header-more-menu"

interface NavSession {
  lastfmUsername: string
}

interface NavClientProps {
  session: NavSession | null
}

const navLinks = [
  { href: "/charts", label: "Charts", icon: TrendingUp },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
]

export function NavClient({ session }: NavClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function linkClass(href: string) {
    return isActive(href)
      ? "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground transition-all duration-150"
      : "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground/60 hover:text-foreground transition-all duration-150 dark:text-muted-foreground dark:hover:text-foreground"
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 print:hidden">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-background/60 px-4 shadow-lg shadow-black/5 backdrop-blur-xl dark:shadow-black/30">
        {/* Logo */}
        <Link href="/" className="shrink-0 bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-base font-semibold text-transparent">
          Last.fm Advanced
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          <NavSearch username={session?.lastfmUsername} />

          <HeaderMoreMenu pathname={pathname} username={session?.lastfmUsername} />

          {session ? (
            <NotificationsButton username={session.lastfmUsername} />
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}

          <ThemeToggle />
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-3 right-3 top-full z-50 mt-2 flex flex-col gap-1 rounded-2xl border border-foreground/10 bg-background/80 p-4 shadow-lg shadow-black/10 backdrop-blur-xl">
          <NavSearch username={session?.lastfmUsername} />

          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(href)}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          {session ? (
            <>
              <Link
                href={`/user/${session.lastfmUsername}`}
                className={linkClass(`/user/${session.lastfmUsername}`)}
                onClick={() => setMobileMenuOpen(false)}
              >
                {session.lastfmUsername}
              </Link>
              <form action="/api/auth/logout" method="POST">
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start"
                >
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full">
                Sign in
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-1"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("showShortcuts"))
              setMobileMenuOpen(false)
            }}
          >
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </Button>
        </div>
      )}
    </header>
  )
}
