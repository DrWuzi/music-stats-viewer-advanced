'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardPaste, ArrowRight, Clock } from 'lucide-react'

const RECENTLY_COMPARED_KEY = 'recentlyCompared'
const MAX_STORED = 5
const MAX_SHOWN = 3
const LASTFM_ME_KEY = 'lastfmMe'

function saveRecentComparison(user1: string, user2: string) {
  try {
    const stored = localStorage.getItem(RECENTLY_COMPARED_KEY)
    const list: string[] = stored ? JSON.parse(stored) : []
    const entry = `${user1}:${user2}`
    const filtered = list.filter((item) => item !== entry)
    filtered.unshift(entry)
    localStorage.setItem(RECENTLY_COMPARED_KEY, JSON.stringify(filtered.slice(0, MAX_STORED)))
  } catch {
    // ignore storage errors
  }
}

function loadRecentComparisons(): string[] {
  try {
    const stored = localStorage.getItem(RECENTLY_COMPARED_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function loadMyUsername(): string {
  try {
    return localStorage.getItem(LASTFM_ME_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function ComparePage() {
  const router = useRouter()
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [recentList, setRecentList] = useState<string[]>([])
  const [myUsername, setMyUsername] = useState('')

  useEffect(() => {
    setRecentList(loadRecentComparisons())
    setMyUsername(loadMyUsername())
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const a = inputA.trim()
    const b = inputB.trim()
    if (!a || !b) return
    saveRecentComparison(a, b)
    router.push(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`)
  }

  function handleRecentClick(pair: string) {
    const [u1, u2] = pair.split(':')
    router.push(`/compare/${encodeURIComponent(u1)}/${encodeURIComponent(u2)}`)
  }

  function pasteMyUsername() {
    if (myUsername) setInputA(myUsername)
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm mb-3 inline-flex items-center gap-1 transition-colors">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Compare Users</h1>
          <p className="text-muted-foreground mt-1">
            Find out how compatible two Last.fm listeners are.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Your username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="a" className="text-sm font-medium">Your username</label>
              {myUsername && (
                <button
                  type="button"
                  onClick={pasteMyUsername}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title={`Paste "${myUsername}"`}
                >
                  <ClipboardPaste className="h-3 w-3" />
                  Paste {myUsername}
                </button>
              )}
            </div>
            <input
              id="a"
              name="a"
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="e.g. radiohead_fan"
              required
              autoComplete="off"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
            />
          </div>

          {/* Friend's username */}
          <div className="space-y-1.5">
            <label htmlFor="b" className="text-sm font-medium">Friend&apos;s username</label>
            <input
              id="b"
              name="b"
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="e.g. pinkfloyd_lover"
              required
              autoComplete="off"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
            />
          </div>

          <button
            type="submit"
            disabled={!inputA.trim() || !inputB.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compare
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Recently compared */}
        {recentList.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
              <Clock className="h-3 w-3" />
              Recent comparisons
            </p>
            <div className="flex flex-col gap-1.5">
              {recentList.slice(0, MAX_SHOWN).map((pair) => {
                const [u1, u2] = pair.split(':')
                return (
                  <button
                    key={pair}
                    onClick={() => handleRecentClick(pair)}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <span className="font-medium">{u1}</span>
                    <span className="text-muted-foreground text-xs px-2">vs</span>
                    <span className="font-medium">{u2}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
