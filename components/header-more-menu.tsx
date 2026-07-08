"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Keyboard, LogOut, Settings, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderMoreMenuProps {
  pathname: string
  username?: string
}

const exploreLinks = [
  { href: "/compare", label: "Compare", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
]

export function HeaderMoreMenu({ pathname, username }: HeaderMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    function syncPosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const width = 256
      const viewportPadding = 12
      const top = rect.bottom + 10
      const right = Math.max(viewportPadding, window.innerWidth - rect.right)

      setMenuStyle({
        position: "fixed",
        top,
        right,
        width,
        maxHeight: `calc(100vh - ${top + viewportPadding}px)`,
      })
    }

    if (open) {
      syncPosition()
      document.addEventListener("mousedown", closeOnOutsideClick)
      document.addEventListener("keydown", closeOnEscape)
      window.addEventListener("resize", syncPosition)
      window.addEventListener("scroll", syncPosition, true)
    }

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
      window.removeEventListener("resize", syncPosition)
      window.removeEventListener("scroll", syncPosition, true)
    }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        More
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Additional navigation"
          className="z-[60] w-64 rounded-2xl border bg-background p-2 shadow-xl shadow-black/10"
          style={menuStyle}
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Explore
          </div>
          <div className="flex flex-col gap-1">
            {exploreLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
                  ].join(" ")}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="my-2 h-px bg-border/70" />

          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Account
          </div>
          <div className="flex flex-col gap-1">
            {username ? (
              <>
                <Link
                  href={`/user/${username}`}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  {username}
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("showShortcuts"))
                    setOpen(false)
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                  Keyboard shortcuts
                </Button>
                <form action="/api/auth/logout" method="POST">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="submit"
                    className="cursor-pointer flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive dark:text-destructive/80 dark:hover:bg-destructive/10 dark:hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}