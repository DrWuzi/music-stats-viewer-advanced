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
          __html: `(function(){try{var t=localStorage.getItem('theme');var root=document.documentElement;root.classList.remove('dark','theme-rosepine','theme-catppuccin','theme-dracula');if(t==='dark'){root.classList.add('dark')}else if(t==='rosepine'){root.classList.add('dark','theme-rosepine')}else if(t==='catppuccin'){root.classList.add('dark','theme-catppuccin')}else if(t==='dracula'){root.classList.add('dark','theme-dracula')}}catch(e){}})()`
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var w=localStorage.getItem('maxWidthPref');if(w==='wide')document.documentElement.classList.add('mw-wide');else if(w==='full')document.documentElement.classList.add('mw-full')}catch(e){}})()`
        }} />
      </head>
      <body className={inter.className}>
        <NavProgress />
        <Nav />
        <MobileNav />
        {/* No bg-background here — <body> already applies the identical
            class (see app/globals.css's `@layer base` rule) one level up,
            painting even earlier in the stacking order. A `position:fixed;
            z-index:-1` decorative layer (see components/profile-backgrounds.tsx)
            paints *before* ordinary in-flow boxes like this one — if this
            div had its own opaque background, it would completely hide that
            layer. Removing the redundant copy here has zero visual effect on
            any page that doesn't add such a layer. */}
        <main className="min-h-screen pb-16 md:pb-0">{children}</main>
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
