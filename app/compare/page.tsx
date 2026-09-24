'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPaste, ArrowRight, Clock } from 'lucide-react'
import { BackButton } from '@/components/back-button'
import { PageContainer } from '@/components/page-container'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
      <PageContainer maxWidth="lg" padding={false} className="space-y-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-transparent">
            Compare Users
          </h1>
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
            <Input
              id="a"
              name="a"
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="e.g. radiohead_fan"
              required
              autoComplete="off"
              className="h-9"
            />
          </div>

          {/* Friend's username */}
          <div className="space-y-1.5">
            <label htmlFor="b" className="text-sm font-medium">Friend&apos;s username</label>
            <Input
              id="b"
              name="b"
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="e.g. pinkfloyd_lover"
              required
              autoComplete="off"
              className="h-9"
            />
          </div>

          <Button type="submit" disabled={!inputA.trim() || !inputB.trim()} className="w-full">
            Compare
            <ArrowRight className="h-4 w-4" />
          </Button>
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
                    className="flex items-center justify-between rounded-xl border border-foreground/10 bg-background/40 backdrop-blur-md px-3 py-2 text-sm hover:bg-background/60 transition-colors text-left"
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
      </PageContainer>
    </main>
  )
}
