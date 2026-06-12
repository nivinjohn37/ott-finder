import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ticket, Clapperboard } from 'lucide-react'
import { useNowPlaying } from '@/hooks/useMovies'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { RatingBadge } from '@/components/common/RatingBadge'
import { bookMyShowSearchUrl } from '@/lib/booking'
import type { MovieSearchResult } from '@/types'

const LANGUAGES = [
  { code: 'all', label: 'All' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
]

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

function TheatreCard({ movie }: { movie: MovieSearchResult }) {
  const [imgError, setImgError] = useState(false)
  const posterSrc = imgError || !movie.posterUrl ? PLACEHOLDER : movie.posterUrl

  return (
    <motion.div
      className="rounded-xl overflow-hidden bg-cinema-navy group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <Link to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`} className="block relative aspect-poster">
        <img
          src={posterSrc}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
        {movie.voteAverage > 0 && (
          <div className="absolute bottom-2 right-2">
            <RatingBadge value={movie.voteAverage} />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/90 text-white text-2xs font-body font-semibold flex items-center gap-1">
          <Clapperboard size={9} /> In Theatres
        </span>
      </Link>

      <div className="px-2.5 pt-2.5 pb-3">
        <Link to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}>
          <p className="font-heading font-medium text-sm text-cinema-text line-clamp-1">{movie.title}</p>
        </Link>
        <p className="font-body text-2xs text-cinema-muted mt-0.5 mb-2.5">
          {movie.releaseDate
            ? `Released ${new Date(movie.releaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
            : '—'}
        </p>
        <a
          href={bookMyShowSearchUrl(movie.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg accent-gradient text-white text-xs font-body font-semibold hover:shadow-accent-glow transition-shadow"
        >
          <Ticket size={13} /> Book Tickets
        </a>
      </div>
    </motion.div>
  )
}

export function InTheatresPage() {
  const [language, setLanguage] = useState('all')
  const { data, isLoading, isError } = useNowPlaying(language)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-accent" />
        <div>
          <h1 className="font-heading font-bold text-2xl text-cinema-text flex items-center gap-2">
            <Ticket size={24} className="text-accent" /> In Theatres Now
          </h1>
          <p className="text-cinema-muted text-sm font-body mt-0.5">
            Playing on the big screen across India — book your seats on BookMyShow
          </p>
        </div>
      </div>

      {/* Language filter chips */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-body font-medium transition-colors ${
              language === lang.code
                ? 'bg-accent text-white'
                : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text hover:bg-cinema-surface'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonGrid count={20} />
      ) : isError ? (
        <EmptyState
          icon={<Ticket size={28} />}
          title="Failed to load"
          description="Unable to fetch theatre listings. Please try again later."
        />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.map((movie) => (
            <TheatreCard key={movie.tmdbId} movie={movie} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Ticket size={28} />}
          title="No theatrical releases found"
          description="Try a different language filter, or check back soon for new releases."
        />
      )}
    </div>
  )
}
