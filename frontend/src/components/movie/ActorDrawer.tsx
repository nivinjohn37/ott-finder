import { X, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { usePersonFilmography } from '@/hooks/useMovies'
import type { MovieSearchResult } from '@/types'

const PLACEHOLDER = 'https://via.placeholder.com/300x450/0D1421/8899AA?text=No+Poster'

interface Props {
  personId: number
  onClose: () => void
}

export function ActorDrawer({ personId, onClose }: Props) {
  const { data, isLoading } = usePersonFilmography(personId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-cinema-navy border-l border-cinema-navy-border overflow-y-auto shadow-card-hover"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-cinema-navy/95 backdrop-blur-sm border-b border-cinema-navy-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-cinema-text text-base">Filmography</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <DrawerSkeleton />
        ) : data ? (
          <div className="p-4 space-y-5">
            {/* Actor info */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-cinema-surface border border-cinema-navy-border shrink-0">
                {data.profileUrl ? (
                  <img src={data.profileUrl} alt={data.name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cinema-muted">
                    <User size={28} />
                  </div>
                )}
              </div>
              <div>
                <p className="font-heading font-bold text-cinema-text text-lg leading-tight">{data.name}</p>
                {data.knownFor && (
                  <p className="text-cinema-muted text-xs font-body mt-0.5">{data.knownFor}</p>
                )}
                <p className="text-cinema-muted/60 text-xs font-body mt-0.5">
                  {data.credits.length} title{data.credits.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Credits grid */}
            {data.credits.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {data.credits.map((movie) => (
                  <FilmCard
                    key={`${movie.tmdbId}-${movie.mediaType}`}
                    movie={movie}
                    onClose={onClose}
                  />
                ))}
              </div>
            ) : (
              <p className="text-cinema-muted text-sm font-body text-center py-8">No credits found.</p>
            )}
          </div>
        ) : null}
      </motion.div>
    </>
  )
}

function FilmCard({ movie, onClose }: { movie: MovieSearchResult; onClose: () => void }) {
  return (
    <Link
      to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}
      onClick={onClose}
      className="group block"
    >
      <div className="aspect-poster rounded-lg overflow-hidden bg-cinema-surface relative">
        <img
          src={movie.posterUrl ?? PLACEHOLDER}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
        />
        {movie.voteAverage > 0 && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-rating text-2xs font-body font-semibold">
            ★ {movie.voteAverage.toFixed(1)}
          </div>
        )}
      </div>
      <p className="text-2xs font-body font-medium text-cinema-text mt-1.5 line-clamp-2 leading-tight">
        {movie.title}
      </p>
      <p className="text-2xs text-cinema-muted/70 font-body">
        {movie.releaseDate?.slice(0, 4) ?? '—'}
      </p>
    </Link>
  )
}

function DrawerSkeleton() {
  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="aspect-poster skeleton rounded-lg" />
            <div className="h-3 w-full skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
