import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Connect your Last.fm account to get started</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-destructive text-center">
              {error === 'auth_failed'
                ? 'Authentication failed. Please try again.'
                : 'Something went wrong.'}
            </p>
          )}
          <Link href="/api/auth/lastfm/login">
            <Button className="w-full">Sign in with Last.fm</Button>
          </Link>
          <p className="text-xs text-center text-muted-foreground">
            You&apos;ll be redirected to Last.fm to authorize access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
