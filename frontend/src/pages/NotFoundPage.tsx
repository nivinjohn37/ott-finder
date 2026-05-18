import { Link } from 'react-router-dom'
import { Film } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-cinema-navy border border-cinema-navy-border flex items-center justify-center text-cinema-muted">
        <Film size={36} />
      </div>
      <h1 className="font-heading font-bold text-5xl text-cinema-text">404</h1>
      <p className="text-cinema-muted font-body max-w-xs">
        This page doesn't exist. The movie might have been removed or the link is broken.
      </p>
      <Link
        to="/"
        className="mt-2 px-6 py-3 rounded-lg accent-gradient text-white font-body font-semibold hover:shadow-accent-glow transition-shadow"
      >
        Go to Home
      </Link>
    </div>
  )
}
