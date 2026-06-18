"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, User, BarChart2, Search } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/search", label: "Search", icon: Search },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full z-40 flex-col group transition-[width] duration-200 w-16 hover:w-60 overflow-hidden border-r bg-card">
      {/* Logo area */}
      <div className="flex h-14 items-center px-4 border-b shrink-0">
        <LayoutDashboard className="h-5 w-5 shrink-0 text-foreground" />
        <span className="ml-3 font-semibold text-sm whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Last.fm Advanced
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
