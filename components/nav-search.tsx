"use client"

import { useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search } from "lucide-react"

interface NavSearchProps {
  username?: string
}

export function NavSearch({ username }: NavSearchProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const trimmed = query.trim()
      if (!trimmed) return
      const url = username
        ? `/artist/${encodeURIComponent(trimmed)}?username=${encodeURIComponent(username)}`
        : `/artist/${encodeURIComponent(trimmed)}`
      router.push(url)
      setQuery("")
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search artists..."
        className="rounded-full border border-border/50 bg-background/50 pl-8 pr-3 py-1 text-sm outline-none focus:border-border focus:bg-background transition-colors w-36 focus:w-48"
        aria-label="Search artists"
      />
    </div>
  )
}
