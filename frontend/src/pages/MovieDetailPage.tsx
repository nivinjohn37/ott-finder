import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Calendar, Tv2, BookmarkPlus, BookmarkCheck, ExternalLink, Play, X, Clock, User, Share2, Check } from 'lucide-react'
import { ActorDrawer } from '@/components/movie/ActorDrawer'
import { GenreDrawer } from '@/components/movie/GenreDrawer'
import { ReviewSection } from '@/components/movie/ReviewSection'
import { useMovieDetail } from '@/hooks/useMovies'
import { useAddToWatchlist, useIsInWatchlist, useWatchlist } from '@/hooks/useWatchlist'
import { PlatformBadge } from '@/components/common/PlatformBadge'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

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
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [shared, setShared] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const { addItem } = useRecentlyViewed()

  useEffect(() => {
    if (movie && user) addItem(movie)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.tmdbId, user?.uid])

  async function handleShare() {
    const url = window.location.href
    const title = movie?.title ?? 'Check this out'
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

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

            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-2 leading-tight">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-cinema-muted/70 font-body text-sm italic mb-4">
                "{movie.tagline}"
              </p>
            )}

            {/* Genres + runtime */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {movie.genres?.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className="px-2.5 py-0.5 rounded-full bg-cinema-navy border border-cinema-navy-border text-cinema-muted text-xs font-body hover:border-accent/50 hover:text-accent transition-colors"
                >
                  {g}
                </button>
              ))}
              {movie.runtime && movie.runtime > 0 && (
                <span className="inline-flex items-center gap-1 text-cinema-muted text-xs font-body">
                  <Clock size={12} />
                  {movie.mediaType === 'tv'
                    ? `${movie.runtime}m / ep`
                    : `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`}
                </span>
              )}
            </div>

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
              {movie.trailerKey && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-body font-semibold text-sm transition-all backdrop-blur-sm"
                >
                  <Play size={16} fill="currentColor" /> Watch Trailer
                </button>
              )}

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

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg glass text-cinema-muted hover:text-cinema-text font-body font-medium text-sm transition-all"
                aria-label="Share"
              >
                {shared ? <><Check size={16} className="text-green-400" /> Copied!</> : <><Share2 size={16} /> Share</>}
              </button>
            </div>

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading font-semibold text-base text-cinema-text mb-3 flex items-center gap-2">
                  <User size={15} className="text-cinema-muted" /> Cast
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {movie.cast.map((member) => (
                    <button
                      key={member.name}
                      onClick={() => {
                        if (!member.personId) return
                        if (!user) { signInWithGoogle(); return }
                        setSelectedPersonId(member.personId)
                      }}
                      className={`flex-shrink-0 w-20 text-center group ${member.personId ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-cinema-navy border border-cinema-navy-border mx-auto mb-1.5 group-hover:ring-2 group-hover:ring-accent/50 transition-all">
                        {member.profileUrl ? (
                          <img src={member.profileUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cinema-muted/40">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <p className="text-cinema-text text-2xs font-body font-medium leading-tight line-clamp-2">{member.name}</p>
                      <p className="text-cinema-muted/60 text-2xs font-body leading-tight line-clamp-1 mt-0.5">{member.character}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-accent" />
                <Star size={15} className="text-cinema-muted" />
                <h2 className="font-heading font-semibold text-cinema-text text-base">Reviews</h2>
              </div>
              <ReviewSection tmdbId={movie.tmdbId} />
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

      <AnimatePresence>
        {trailerOpen && movie.trailerKey && (
          <TrailerModal trailerKey={movie.trailerKey} onClose={() => setTrailerOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPersonId !== null && (
          <ActorDrawer
            personId={selectedPersonId}
            onClose={() => setSelectedPersonId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGenre !== null && (
          <GenreDrawer
            genreName={selectedGenre}
            onClose={() => setSelectedGenre(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TrailerModal({ trailerKey, onClose }: { trailerKey: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl"
      >
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
          title="Trailer"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="w-full h-full"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
        >
          <X size={18} />
        </button>
      </motion.div>
    </motion.div>
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
