'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CompareScore } from '@/components/compare-score'
import { CompareArtists } from '@/components/compare-artists'

const RECENTLY_COMPARED_KEY = 'recentlyCompared'
const MAX_RECENT = 5

function saveRecentComparison(user1: string, user2: string) {
  try {
    const stored = localStorage.getItem(RECENTLY_COMPARED_KEY)
    const list: string[] = stored ? JSON.parse(stored) : []
    const entry = `${user1}:${user2}`
    const filtered = list.filter((item) => item !== entry)
    filtered.unshift(entry)
    localStorage.setItem(RECENTLY_COMPARED_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
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

interface CompareResult {
  sharedArtists: number
  compatibilityScore: number
  uniqueToUser1: { name: string; playcount: number }[]
  uniqueToUser2: { name: string; playcount: number }[]
  topShared: { name: string; playcount1: number; playcount2: number; total: number }[]
}

function compatibilityLabel(score: number): string {
  if (score > 50) return 'Music Twins!'
  if (score >= 20) return 'Some overlap'
  return 'Different taste'
}

export default function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const paramA = searchParams.get('a')?.trim() ?? ''
  const paramB = searchParams.get('b')?.trim() ?? ''

  const [inputA, setInputA] = useState(paramA)
  const [inputB, setInputB] = useState(paramB)

  const [result, setResult] = useState<CompareResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [recentList, setRecentList] = useState<string[]>([])

  useEffect(() => {
    setRecentList(loadRecentComparisons())
  }, [])

  const fetchCompare = useCallback(async (user1: string, user2: string) => {
    setLoading(true)
    setResult(null)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/compare?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`)
      if (!res.ok) {
        const body = await res.json()
        setErrorMsg(body?.missing
          ? `User "${body.missing}" not found — visit /user/${body.missing} first to sync their data.`
          : (body?.error ?? 'Something went wrong'))
        return
      }
      const data: CompareResult = await res.json()
      setResult(data)
      saveRecentComparison(user1, user2)
      setRecentList(loadRecentComparisons())
    } catch {
      setErrorMsg('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch when both URL params are present
  useEffect(() => {
    if (paramA && paramB) {
      setInputA(paramA)
      setInputB(paramB)
      fetchCompare(paramA, paramB)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramA, paramB])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const a = inputA.trim()
    const b = inputB.trim()
    if (!a || !b) return
    router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`)
  }

  function handleRecentClick(pair: string) {
    const [u1, u2] = pair.split(':')
    router.push(`/compare?a=${encodeURIComponent(u1)}&b=${encodeURIComponent(u2)}`)
  }

  const showResults = result && paramA && paramB

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold">Compare Users</h1>
          <p className="text-muted-foreground mt-1">
            Find out how compatible two Last.fm listeners are.
          </p>
        </div>

        {/* Recently compared chips */}
        {recentList.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Recently compared</p>
            <div className="flex flex-wrap gap-2">
              {recentList.map((pair) => (
                <button
                  key={pair}
                  onClick={() => handleRecentClick(pair)}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {pair.replace(':', ' vs ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label htmlFor="a" className="text-sm font-medium">First username</label>
            <input
              id="a"
              name="a"
              type="text"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="e.g. radiohead_fan"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="b" className="text-sm font-medium">Second username</label>
            <input
              id="b"
              name="b"
              type="text"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="e.g. pinkfloyd_lover"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </form>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 max-w-md">
            <p className="text-destructive font-medium text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <>
            <h2 className="text-xl font-bold">{paramA} vs {paramB}</h2>

            {/* Compatibility score circle */}
            <Card className="p-6">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm uppercase tracking-widest text-muted-foreground">
                  Compatibility Score
                </p>
                <CompareScore
                  score={result.compatibilityScore}
                  user1={paramA}
                  user2={paramB}
                  sharedCount={result.sharedArtists}
                />
                <p className="text-lg font-semibold">{compatibilityLabel(result.compatibilityScore)}</p>
              </div>
            </Card>

            {/* Artist breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Artist Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CompareArtists
                  topShared={result.topShared}
                  uniqueToUser1={result.uniqueToUser1}
                  uniqueToUser2={result.uniqueToUser2}
                  user1={paramA}
                  user2={paramB}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
