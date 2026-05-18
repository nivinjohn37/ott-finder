import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cinema-black">
      <Navbar />
      <main className="pt-16">{children}</main>
      <footer className="mt-20 border-t border-cinema-navy-border py-8 text-center text-cinema-muted text-sm font-body">
        <p>© 2024 OTTFinder — Find where to watch in India</p>
        <p className="mt-1 text-xs text-cinema-muted/50">
          Data powered by TMDB & JustWatch. Not affiliated with any platform.
        </p>
      </footer>
    </div>
  )
}
