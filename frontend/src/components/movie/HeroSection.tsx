import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MovieSearchResult } from '@/types'
import { RatingBadge } from '@/components/common/RatingBadge'
import { PlatformBadge } from '@/components/common/PlatformBadge'

interface Props {
  movies: MovieSearchResult[]
}

export function HeroSection({ movies }: Props) {
  const featured = movies.slice(0, 5)
  const [current, setCurrent] = useState(0)
  const movie = featured[current]

  useEffect(() => {
    if (featured.length <= 1) return
    const id = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 6000)
    return () => clearInterval(id)
  }, [featured.length])

  if (!movie) return null

  const backdropSrc = movie.backdropUrl
    ? movie.backdropUrl.replace('w500', 'original')
    : movie.posterUrl ?? null

  return (
    <div className="relative h-[70vh] min-h-[500px] max-h-[750px] overflow-hidden">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.tmdbId}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {backdropSrc ? (
            <img
              src={backdropSrc}
              alt=""
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-cinema-navy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-cinema-black via-cinema-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-transparent to-cinema-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={movie.tmdbId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <RatingBadge value={movie.voteAverage} />
              {movie.releaseDate && (
                <span className="text-cinema-muted text-sm font-body">{movie.releaseDate.slice(0, 4)}</span>
              )}
              <span className="px-2 py-0.5 rounded text-xs font-body font-medium bg-cinema-navy border border-cinema-navy-border text-cinema-muted uppercase">
                {movie.mediaType}
              </span>
            </div>

            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-3">
              {movie.title}
            </h1>

            {movie.overview && (
              <p className="text-cinema-muted font-body text-sm leading-relaxed line-clamp-3 mb-5">
                {movie.overview}
              </p>
            )}

            {movie.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.platforms.slice(0, 4).map((p) => (
                  <PlatformBadge key={p.platformName} platform={p} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Link
                to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg accent-gradient text-white font-body font-semibold hover:shadow-accent-glow transition-shadow"
              >
                <Play size={16} fill="currentColor" /> Watch Now
              </Link>
              <Link
                to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg glass text-cinema-text font-body font-medium hover:bg-cinema-navy transition-colors"
              >
                <Info size={16} /> More Info
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel controls */}
        {featured.length > 1 && (
          <div className="absolute bottom-6 right-6 flex items-center gap-3">
            <button
              onClick={() => setCurrent((c) => (c - 1 + featured.length) % featured.length)}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-cinema-muted hover:text-cinema-text"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1.5">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 bg-accent' : 'w-1.5 bg-cinema-muted/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((c) => (c + 1) % featured.length)}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-cinema-muted hover:text-cinema-text"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
