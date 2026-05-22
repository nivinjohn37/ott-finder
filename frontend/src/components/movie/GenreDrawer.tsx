import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useGenreMovies } from '@/hooks/useMovies'

const PLACEHOLDER = 'https://via.placeholder.com/300x450/0D1421/8899AA?text=No+Poster'

interface Props {
  genreName: string
  onClose: () => void
}

export function GenreDrawer({ genreName, onClose }: Props) {
  const { data: movies = [], isLoading } = useGenreMovies(genreName)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-cinema-navy border-l border-cinema-navy-border overflow-y-auto shadow-card-hover"
      >
        <div className="sticky top-0 bg-cinema-navy/95 backdrop-blur-sm border-b border-cinema-navy-border px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold text-cinema-text text-base">{genreName}</h2>
            {!isLoading && (
              <p className="text-cinema-muted/60 text-xs font-body mt-0.5">
                Top {movies.length} popular titles
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <DrawerSkeleton />
        ) : movies.length === 0 ? (
          <p className="text-cinema-muted text-sm font-body text-center py-12">No titles found.</p>
        ) : (
          <div className="p-4 grid grid-cols-3 gap-3">
            {movies.map((movie) => (
              <Link
                key={`${movie.tmdbId}-${movie.mediaType}`}
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
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}

function DrawerSkeleton() {
  return (
    <div className="p-4 grid grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="aspect-poster skeleton rounded-lg" />
          <div className="h-3 w-full skeleton rounded" />
          <div className="h-3 w-10 skeleton rounded" />
        </div>
      ))}
    </div>
  )
}
