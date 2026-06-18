import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav-server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Last.fm Advanced',
  description: 'Advanced Last.fm analytics dashboard',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`
          }}
        />
        <Nav />
        <main className="min-h-screen bg-background">{children}</main>
      </body>
    </html>
  )
}
