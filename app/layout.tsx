import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav-server'
import { NavProgress } from '@/components/nav-progress'
import { MobileNav } from '@/components/mobile-nav'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { NowPlayingMini } from '@/components/now-playing-mini'
import { NowPlayingProvider } from '@/components/now-playing-context'
import { getSession } from '@/lib/session'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Last.fm Advanced',
  description: 'Advanced Last.fm analytics dashboard',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <html lang="en">
      <head>
        <meta name="view-transition" content="same-origin" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`
        }} />
      </head>
      <body className={inter.className}>
        <NavProgress />
        <Nav />
        <MobileNav />
        <main className="min-h-screen bg-background pb-16 md:pb-0">{children}</main>
        {session?.lastfmUsername && (
          <NowPlayingProvider username={session.lastfmUsername}>
            <NowPlayingMini />
          </NowPlayingProvider>
        )}
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
