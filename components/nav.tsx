import Link from 'next/link'
import { Search, Trophy } from 'lucide-react'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export async function Nav() {
  const session = await getSession()

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold text-lg">
          Last.fm Advanced
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/search" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Search className="h-4 w-4" />
            Search
          </Link>
          <Link href="/compare" className="text-sm text-muted-foreground hover:text-foreground">
            Compare
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </Link>
          {session ? (
            <>
              <Link href={`/user/${session.lastfmUsername}`} className="text-sm text-muted-foreground hover:text-foreground">
                {session.lastfmUsername}
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <form action="/api/auth/logout" method="POST">
                <Button variant="ghost" size="sm" type="submit">Sign out</Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
