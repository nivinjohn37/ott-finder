import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Calendar, Tv2, BookmarkPlus, BookmarkCheck, ExternalLink } from 'lucide-react'
import { useMovieDetail } from '@/hooks/useMovies'
import { useAddToWatchlist, useIsInWatchlist, useWatchlist } from '@/hooks/useWatchlist'
import { PlatformBadge } from '@/components/common/PlatformBadge'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'

const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720/0D1421/8899AA?text=No+Image'
const PLACEHOLDER_POSTER = 'https://via.placeholder.com/300x450/0D1421/8899AA?text=No+Poster'

export function MovieDetailPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const [params] = useSearchParams()
  const type = params.get('type') ?? undefined
  const { data: movie, isLoading, isError } = useMovieDetail(Number(tmdbId), type)
  const { user, signInWithGoogle } = useAuth()
  const { data: watchlist } = useWatchlist()
  const isInWatchlist = useIsInWatchlist(Number(tmdbId))
  const { mutateAsync: add } = useAddToWatchlist()
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!user) { signInWithGoogle(); return }
    if (isInWatchlist || !movie || adding) return
    setAdding(true)
    try { await add({ movieId: movie.tmdbId, mediaType: movie.mediaType }) }
    finally { setAdding(false) }
  }

  if (isLoading) return <DetailSkeleton />
  if (isError || !movie) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <p className="text-cinema-muted font-body">Movie not found.</p>
      <Link to="/" className="text-accent font-body text-sm hover:underline">← Go home</Link>
    </div>
  )

  const watchlistEntry = watchlist?.find((w) => w.movie.tmdbId === movie.tmdbId)

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-[50vh] min-h-[350px] overflow-hidden">
        <img
          src={movie.backdropUrl ?? movie.posterUrl ?? PLACEHOLDER_BACKDROP}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-black/70 to-transparent" />

        {/* Back button */}
        <Link
          to={-1 as unknown as string}
          className="absolute top-6 left-4 sm:left-8 flex items-center gap-2 px-3 py-2 rounded-lg glass text-cinema-muted hover:text-cinema-text transition-colors text-sm font-body"
        >
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      {/* Detail content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <div className="flex gap-6 lg:gap-10">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden sm:block flex-shrink-0 w-44 lg:w-56"
          >
            <div className="rounded-xl overflow-hidden shadow-card-hover ring-2 ring-cinema-navy-border">
              <img
                src={movie.posterUrl ?? PLACEHOLDER_POSTER}
                alt={movie.title}
                className="w-full aspect-poster object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0 pt-6"
          >
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {movie.voteAverage > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rating/15 text-rating text-sm font-body font-semibold">
                  <Star size={13} fill="currentColor" /> {movie.voteAverage.toFixed(1)}
                  <span className="text-cinema-muted font-normal text-xs ml-0.5">({movie.voteCount?.toLocaleString()})</span>
                </span>
              )}
              {movie.releaseDate && (
                <span className="inline-flex items-center gap-1 text-cinema-muted text-sm font-body">
                  <Calendar size={13} /> {movie.releaseDate.slice(0, 4)}
                </span>
              )}
              <span className="px-2 py-0.5 rounded border border-cinema-navy-border text-cinema-muted text-xs font-body uppercase flex items-center gap-1">
                {movie.mediaType === 'tv' ? <><Tv2 size={11} /> TV Show</> : 'Movie'}
              </span>
            </div>

            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4 leading-tight">
              {movie.title}
            </h1>

            {movie.overview && (
              <p className="text-cinema-muted font-body text-sm leading-relaxed max-w-2xl mb-6">
                {movie.overview}
              </p>
            )}

            {/* Where to watch */}
            {movie.platforms.length > 0 ? (
              <div className="mb-6">
                <h2 className="font-heading font-semibold text-base text-cinema-text mb-3">
                  Where to Watch
                </h2>
                <div className="flex flex-wrap gap-2">
                  {movie.platforms.map((p) => (
                    <PlatformBadge key={p.platformName} platform={p} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 px-4 py-3 rounded-lg bg-cinema-navy border border-cinema-navy-border">
                <p className="text-cinema-muted font-body text-sm">
                  Not currently available on Indian OTT platforms. Add to watchlist to get notified.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAdd}
                disabled={isInWatchlist || adding}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body font-semibold text-sm transition-all ${
                  isInWatchlist
                    ? 'bg-accent/20 text-accent border border-accent/30 cursor-default'
                    : 'accent-gradient text-white hover:shadow-accent-glow disabled:opacity-60'
                }`}
              >
                {isInWatchlist ? (
                  <><BookmarkCheck size={16} /> In Watchlist</>
                ) : (
                  <><BookmarkPlus size={16} /> {adding ? 'Adding…' : 'Add to Watchlist'}</>
                )}
              </button>

              {movie.platforms[0]?.deepLink && (
                <a
                  href={movie.platforms[0].deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg glass text-cinema-text font-body font-medium text-sm hover:bg-cinema-navy transition-colors"
                >
                  <ExternalLink size={16} /> Watch on {movie.platforms[0].displayName}
                </a>
              )}
            </div>

            {/* Expiry warning */}
            {watchlistEntry?.expiringPlatforms && watchlistEntry.expiringPlatforms.length > 0 && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-lg bg-accent/10 border border-accent/20">
                <span className="text-accent text-sm">⏰</span>
                <p className="text-accent text-sm font-body">
                  Leaving soon from {watchlistEntry.expiringPlatforms.map((p) => p.displayName).join(', ')}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[50vh] min-h-[350px] skeleton" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <div className="flex gap-6 lg:gap-10">
          <div className="hidden sm:block w-44 lg:w-56 aspect-poster rounded-xl skeleton flex-shrink-0" />
          <div className="flex-1 pt-6 space-y-4">
            <div className="h-5 w-32 rounded skeleton" />
            <div className="h-10 w-2/3 rounded skeleton" />
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-4 w-5/6 rounded skeleton" />
            <div className="h-4 w-4/6 rounded skeleton" />
            <div className="flex gap-2 mt-4">
              <div className="h-9 w-28 rounded skeleton" />
              <div className="h-9 w-28 rounded skeleton" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
