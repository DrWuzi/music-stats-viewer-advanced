import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchForm } from '@/components/search-form'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-8 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-foreground/10 bg-card/60 p-10 text-center shadow-2xl shadow-black/5 backdrop-blur-xl dark:shadow-black/30">
        <div className="space-y-2">
          <h1 className="bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-4xl font-bold text-transparent">
            Last.fm Advanced
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Deep analytics for your Last.fm listening history — stored locally, always fast.
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4">
          <SearchForm />
          {!session && (
            <Link href="/login">
              <Button variant="outline">Sign in to track your own stats</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
