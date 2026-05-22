import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, BookmarkPlus, BookmarkCheck, Tv2 } from 'lucide-react'
import type { MovieSearchResult } from '@/types'
import { getPlatformColor } from '@/types'
import { RatingBadge } from '@/components/common/RatingBadge'
import { useAuth } from '@/context/AuthContext'
import { useAddToWatchlist, useIsInWatchlist } from '@/hooks/useWatchlist'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

interface Props {
  movie: MovieSearchResult
  priority?: boolean
}

export function MovieCard({ movie, priority = false }: Props) {
  const [imgError, setImgError] = useState(false)
  const [adding, setAdding] = useState(false)
  const { user, signInWithGoogle } = useAuth()
  const isInWatchlist = useIsInWatchlist(movie.tmdbId)
  const { mutateAsync: addToWatchlist } = useAddToWatchlist()


  async function handleWatchlistToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { signInWithGoogle(); return }
    if (isInWatchlist || adding) return
    setAdding(true)
    try {
      await addToWatchlist({ movieId: movie.tmdbId, mediaType: movie.mediaType })
    } finally {
      setAdding(false)
    }
  }

  const posterSrc = imgError || !movie.posterUrl ? PLACEHOLDER : movie.posterUrl

  return (
    <Link to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`} className="block group">
      <motion.div
        className="relative rounded-xl overflow-hidden bg-cinema-navy cursor-pointer"
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Poster */}
        <div className="aspect-poster w-full relative">
          <img
            src={posterSrc}
            alt={movie.title}
            loading={priority ? 'eager' : 'lazy'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />

          {/* Gradient overlay (always subtle at bottom) */}
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Hover overlay with play + title slide-up */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Platform dots */}
            {movie.platforms.length > 0 && (
              <div className="flex gap-1 mb-2">
                {movie.platforms.slice(0, 4).map((p) => (
                  <span
                    key={p.platformName}
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: getPlatformColor(p.platformName) }}
                    title={p.displayName}
                  />
                ))}
                {movie.platforms.length > 4 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cinema-muted flex items-center justify-center">
                    <span className="text-2xs text-white leading-none">+{movie.platforms.length - 4}</span>
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <p className="font-heading font-semibold text-sm text-white leading-tight line-clamp-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              {movie.title}
            </p>
          </div>

          {/* Play button center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </div>
          </div>

          {/* Watchlist button top-right */}
          <button
            onClick={handleWatchlistToggle}
            className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
              isInWatchlist
                ? 'bg-accent text-white opacity-100'
                : 'bg-cinema-black/60 backdrop-blur-sm text-cinema-muted opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-cinema-black/80'
            } ${adding ? 'animate-pulse-slow' : ''}`}
            aria-label={isInWatchlist ? 'In watchlist' : 'Add to watchlist'}
          >
            {isInWatchlist ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
          </button>

          {/* Media type badge top-left */}
          {movie.mediaType === 'tv' && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-sky-badge/20 text-sky-badge text-2xs font-body font-medium border border-sky-badge/30 flex items-center gap-1">
              <Tv2 size={9} /> TV
            </span>
          )}

          {/* Rating badge - visible always */}
          {movie.voteAverage > 0 && (
            <div className="absolute bottom-2 right-2 group-hover:opacity-0 transition-opacity duration-300">
              <RatingBadge value={movie.voteAverage} />
            </div>
          )}
        </div>

        {/* Card footer (visible outside hover) */}
        <div className="px-2 py-2.5 group-hover:opacity-0 transition-opacity duration-200">
          <p className="font-heading font-medium text-sm text-cinema-text line-clamp-1">{movie.title}</p>
          <p className="font-body text-2xs text-cinema-muted mt-0.5">
            {movie.releaseDate ? movie.releaseDate.slice(0, 4) : '—'}
            {movie.platforms.length > 0 && (
              <span className="ml-1.5 text-accent">· {movie.platforms.length} platform{movie.platforms.length > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </motion.div>
    </Link>
  )
}
