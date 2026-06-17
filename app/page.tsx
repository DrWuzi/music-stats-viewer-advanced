import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchForm } from '@/components/search-form'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Last.fm Advanced</h1>
        <p className="text-muted-foreground max-w-md">
          Deep analytics for your Last.fm listening history — stored locally, always fast.
        </p>
      </div>
      <SearchForm />
      {!session && (
        <Link href="/login">
          <Button variant="outline">Sign in to track your own stats</Button>
        </Link>
      )}
    </div>
  )
}
