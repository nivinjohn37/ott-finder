import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { MovieSearchResult } from '@/types'
import { RatingBadge } from '@/components/common/RatingBadge'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

interface Props {
  title: string
  icon: React.ReactNode
  movies: MovieSearchResult[]
  accentColor?: string
  showExpiry?: boolean
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function CuratedShelf({ title, icon, movies, accentColor = 'text-accent', showExpiry = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!movies.length) return null

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-accent" />
          <h2 className={`font-heading font-bold text-xl text-cinema-text flex items-center gap-2 ${accentColor}`}>
            {icon}
            <span className="text-cinema-text">{title}</span>
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text hover:border-accent/40 transition-colors flex items-center justify-center"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text hover:border-accent/40 transition-colors flex items-center justify-center"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cinema-navy-border [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {movies.map((movie) => (
          <ShelfCard key={movie.tmdbId} movie={movie} showExpiry={showExpiry} />
        ))}
      </div>
    </section>
  )
}

function ShelfCard({ movie, showExpiry }: { movie: MovieSearchResult; showExpiry: boolean }) {
  const expiryDate = showExpiry
    ? movie.platforms.map(p => p.availableUntil).filter(Boolean)[0] ?? null
    : null
  const days = daysUntil(expiryDate)

  return (
    <Link
      to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}
      className="flex-none w-32 sm:w-36 group"
    >
      <div className="relative rounded-xl overflow-hidden bg-cinema-navy aspect-poster transition-transform duration-250 group-hover:-translate-y-1 group-hover:scale-[1.02]">
        <img
          src={movie.posterUrl ?? PLACEHOLDER}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
        />

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* title on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <p className="font-heading font-semibold text-xs text-white leading-tight line-clamp-2">
            {movie.title}
          </p>
        </div>

        {/* rating badge always visible */}
        {movie.voteAverage > 0 && (
          <div className="absolute top-1.5 right-1.5 group-hover:opacity-0 transition-opacity duration-300">
            <RatingBadge value={movie.voteAverage} />
          </div>
        )}

        {/* expiry badge */}
        {showExpiry && days !== null && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/90 text-white text-2xs font-body font-semibold">
            <Clock size={9} />
            {days === 0 ? 'Today' : `${days}d`}
          </div>
        )}
      </div>

      <p className="mt-1.5 font-body text-xs text-cinema-muted leading-tight line-clamp-1 group-hover:text-cinema-text transition-colors">
        {movie.title}
      </p>
    </Link>
  )
}
