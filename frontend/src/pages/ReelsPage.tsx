import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck, Info, Volume2, VolumeX, X, Play, Film } from 'lucide-react'
import { useTrending } from '@/hooks/useMovies'
import { useAddToWatchlist, useIsInWatchlist } from '@/hooks/useWatchlist'
import { useAuth } from '@/context/AuthContext'
import { getMovieDetail } from '@/api/movies'
import type { MovieSearchResult, MovieDetail } from '@/types'

// ─── Action button ───────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 group disabled:opacity-50"
    >
      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:border-white/40 group-hover:bg-black/60 transition-all">
        {icon}
      </div>
      <span className="text-white/70 text-[11px] font-body">{label}</span>
    </button>
  )
}

// ─── Single reel card ─────────────────────────────────────────────────────────

function ReelCard({
  movie,
  isActive,
  isPrefetch,
  isMuted,
  index,
  onHide,
}: {
  movie: MovieSearchResult
  isActive: boolean
  isPrefetch: boolean
  isMuted: boolean
  index: number
  onHide: () => void
}) {
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuth()
  const inWatchlist = useIsInWatchlist(movie.tmdbId)
  const { mutateAsync: addToWatchlist, isPending } = useAddToWatchlist()
  const [optimisticSaved, setOptimisticSaved] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch movie detail (with trailerKey + genres) only when active or prefetching
  const { data: detail } = useQuery<MovieDetail>({
    queryKey: ['movies', 'detail', movie.tmdbId, movie.mediaType],
    queryFn: () => getMovieDetail(movie.tmdbId, movie.mediaType),
    enabled: isActive || isPrefetch,
    staleTime: 15 * 60 * 1000,
  })

  const trailerKey = detail?.trailerKey
  const genres = detail?.genres?.slice(0, 2) ?? []
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null
  const isSaved = inWatchlist || optimisticSaved

  // Re-trigger fade-in animation when trailer key arrives or active state changes
  useEffect(() => {
    setVideoLoaded(false)
  }, [trailerKey, isActive])

  // Mute/unmute via postMessage (requires enablejsapi=1 in src)
  useEffect(() => {
    if (!iframeRef.current) return
    const command = isMuted ? 'mute' : 'unMute'
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      '*',
    )
  }, [isMuted])

  const iframeSrc =
    isActive && trailerKey
      ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${trailerKey}&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`
      : ''

  const handleSave = async () => {
    if (!user) {
      signInWithGoogle()
      return
    }
    setOptimisticSaved(true)
    try {
      await addToWatchlist({ movieId: movie.tmdbId, mediaType: movie.mediaType })
    } catch {
      setOptimisticSaved(false)
    }
  }

  return (
    <div className="relative h-[calc(100dvh_-_4rem)] w-full snap-start overflow-hidden flex-shrink-0 bg-cinema-black">

      {/* Backdrop — always visible as placeholder/fallback */}
      {movie.backdropUrl && (
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* YouTube trailer iframe — covers full reel, aspect-ratio letterbox trick */}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          key={trailerKey}
          src={iframeSrc}
          onLoad={() => setVideoLoaded(true)}
          title={movie.title}
          allow="autoplay; encrypted-media"
          className={`absolute w-screen min-w-[177.78vh] h-[56.25vw] min-h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-700 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* No trailer fallback indicator */}
      {isActive && detail && !trailerKey && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none">
          <Film size={40} />
          <span className="text-xs font-body">No trailer available</span>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />

      {/* Top bar: index + dismiss */}
      <div className="absolute top-3 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        <span className="text-white/40 text-xs font-body tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <button
          onClick={onHide}
          className="pointer-events-auto p-1.5 rounded-full bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Right action column */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-5 items-center">
        <ActionBtn
          icon={
            isSaved ? (
              <BookmarkCheck size={24} className="text-accent" />
            ) : (
              <Bookmark size={24} className="text-white" />
            )
          }
          label={isSaved ? 'Saved' : 'Save'}
          onClick={handleSave}
          disabled={isPending}
        />
        <ActionBtn
          icon={<Info size={24} className="text-white" />}
          label="Details"
          onClick={() => navigate(`/movie/${movie.tmdbId}?type=${movie.mediaType}`)}
        />
        {trailerKey && (
          <ActionBtn
            icon={<Play size={24} className="text-white" />}
            label="Full"
            onClick={() =>
              window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank')
            }
          />
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-4 right-20 pb-5">
        {movie.platforms.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {movie.platforms.slice(0, 3).map((p) => (
              <span
                key={p.platformName}
                className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-body px-2 py-0.5 rounded-full border border-white/10"
              >
                {p.displayName}
              </span>
            ))}
            {movie.platforms.length === 0 && (
              <span className="text-white/30 text-[11px] font-body">Not streaming</span>
            )}
          </div>
        )}

        <h2 className="text-white text-xl font-heading font-bold leading-tight mb-1">
          {movie.title}
        </h2>

        <div className="flex items-center gap-1.5 text-white/60 text-sm font-body flex-wrap">
          <span className="text-yellow-400 text-xs">★</span>
          <span>{movie.voteAverage.toFixed(1)}</span>
          {year && (
            <>
              <span className="text-white/30">·</span>
              <span>{year}</span>
            </>
          )}
          {genres.length > 0 && (
            <>
              <span className="text-white/30">·</span>
              <span>{genres.join(', ')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReelsPage() {
  const { data: movies = [], isLoading } = useTrending()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleMovies = movies.filter((m) => !hiddenIds.has(m.tmdbId))

  // Derive active index from scroll position — each card is exactly container height
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleScroll = () => {
      const cardHeight = container.clientHeight
      if (cardHeight === 0) return
      const idx = Math.round(container.scrollTop / cardHeight)
      setActiveIndex(idx)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  if (isLoading) {
    return (
      <div className="h-[calc(100dvh_-_4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-cinema-muted">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-body">Loading reels…</p>
        </div>
      </div>
    )
  }

  if (visibleMovies.length === 0) {
    return (
      <div className="h-[calc(100dvh_-_4rem)] flex items-center justify-center">
        <div className="text-center text-cinema-muted">
          <Film size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-heading font-semibold mb-2">You've seen them all</p>
          <button
            onClick={() => setHiddenIds(new Set())}
            className="text-sm text-accent hover:underline font-body"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Global mute toggle — fixed so it's always reachable */}
      <button
        onClick={() => setIsMuted((m) => !m)}
        title={isMuted ? 'Unmute' : 'Mute'}
        className="fixed bottom-6 right-4 z-40 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all shadow-lg"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div
        ref={containerRef}
        className="h-[calc(100dvh_-_4rem)] overflow-y-scroll snap-y snap-mandatory"
      >
        {visibleMovies.map((movie, i) => (
          <ReelCard
            key={movie.tmdbId}
            movie={movie}
            isActive={i === activeIndex}
            isPrefetch={i === activeIndex + 1}
            isMuted={isMuted}
            index={i}
            onHide={() => setHiddenIds((prev) => new Set([...prev, movie.tmdbId]))}
          />
        ))}
      </div>
    </div>
  )
}
