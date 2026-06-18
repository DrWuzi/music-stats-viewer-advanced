"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Search,
  Trophy,
  Users,
  Settings,
  Keyboard,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavSearch } from "@/components/nav-search"

interface NavSession {
  lastfmUsername: string
}

interface NavClientProps {
  session: NavSession | null
}

const navLinks = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/compare", label: "Compare", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function NavClient({ session }: NavClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function linkClass(href: string) {
    return pathname === href
      ? "flex items-center gap-1 text-sm font-semibold text-foreground"
      : "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
  }

  return (
    <header className="border-b relative">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="font-semibold text-lg shrink-0">
          Last.fm Advanced
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          {session ? (
            <>
              <Link
                href={`/user/${session.lastfmUsername}`}
                className={linkClass(`/user/${session.lastfmUsername}`)}
              >
                {session.lastfmUsername}
              </Link>
              <Link href="/dashboard">
                <Button
                  variant={pathname === "/dashboard" ? "default" : "outline"}
                  size="sm"
                >
                  Dashboard
                </Button>
              </Link>
              <form action="/api/auth/logout" method="POST">
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}

          <NavSearch username={session?.lastfmUsername} />

          <ThemeToggle />

          {/* Keyboard shortcuts button */}
          <Button
            variant="ghost"
            size="icon"
            title="Keyboard shortcuts (?)"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("showShortcuts"))
            }
          >
            <Keyboard className="h-4 w-4" />
          </Button>
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
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 flex flex-col gap-1 bg-card border-b shadow-md p-4">
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
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={pathname === "/dashboard" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                >
                  Dashboard
                </Button>
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
