import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dice6, Star, RotateCcw, Bookmark, ExternalLink, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTrending } from '@/hooks/useMovies'
import { useAddToWatchlist, useIsInWatchlist } from '@/hooks/useWatchlist'
import { useAuth } from '@/context/AuthContext'
import type { MovieSearchResult } from '@/types'
import { getPlatformColor } from '@/types'

const PLATFORM_LABELS: Record<string, string> = {
  netflix: 'Netflix',
  primevideo: 'Prime Video',
  hotstar: 'Hotstar',
  jiocinema: 'JioCinema',
  sonyliv: 'SonyLIV',
  zee5: 'ZEE5',
  mxplayer: 'MX Player',
}

// Deceleration timing steps (ms) — each step is longer than the last
const SPIN_STEPS = [50, 55, 65, 75, 90, 110, 140, 180, 235, 315, 430, 590, 800]

type TypeFilter = 'all' | 'movie' | 'tv'

function WinnerActions({ winner }: { winner: MovieSearchResult }) {
  const { user } = useAuth()
  const add = useAddToWatchlist()
  const isIn = useIsInWatchlist(winner.tmdbId)

  return (
    <div className="flex gap-3 pt-1">
      <Link
        to={`/movie/${winner.tmdbId}?type=${winner.mediaType}`}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cinema-surface hover:bg-cinema-navy-border text-cinema-text text-sm font-body font-medium transition-colors"
      >
        <ExternalLink size={16} />
        View Details
      </Link>
      {user && (
        <button
          onClick={() => {
            if (!isIn) add.mutate({ movieId: winner.tmdbId, mediaType: winner.mediaType })
          }}
          disabled={isIn || add.isPending}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-medium transition-all ${
            isIn
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'accent-gradient text-white hover:opacity-90 disabled:opacity-60'
          }`}
        >
          {isIn ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {isIn ? 'In Watchlist' : 'Add to Watchlist'}
        </button>
      )}
    </div>
  )
}

export function RoulettePage() {
  const { data: trending = [], isLoading } = useTrending()
  const [platformFilter, setPlatformFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [spinning, setSpinning] = useState(false)
  const [displayed, setDisplayed] = useState<MovieSearchResult | null>(null)
  const [spinStep, setSpinStep] = useState(0)
  const [winner, setWinner] = useState<MovieSearchResult | null>(null)
  const [spunOnce, setSpunOnce] = useState(false)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (trending.length > 0 && !displayed) {
      setDisplayed(trending[Math.floor(Math.random() * Math.min(trending.length, 10))])
    }
  }, [trending, displayed])

  useEffect(() => () => timeouts.current.forEach(clearTimeout), [])

  const filteredPool = trending.filter(m => {
    if (typeFilter !== 'all' && m.mediaType !== typeFilter) return false
    if (platformFilter !== 'all' && !m.platforms.some(p => p.platformName === platformFilter)) return false
    return true
  })

  const spinPool = filteredPool.length >= 2 ? filteredPool : trending

  const availablePlatforms = [
    ...new Set(trending.flatMap(m => m.platforms.map(p => p.platformName))),
  ].filter(p => PLATFORM_LABELS[p])

  const spin = useCallback(() => {
    if (spinning || spinPool.length === 0) return

    const target = spinPool[Math.floor(Math.random() * spinPool.length)]
    setSpinning(true)
    setWinner(null)
    setSpunOnce(true)

    timeouts.current.forEach(clearTimeout)
    timeouts.current = []

    let elapsed = 0
    SPIN_STEPS.forEach((delay, i) => {
      elapsed += delay
      const t = setTimeout(() => {
        if (i < SPIN_STEPS.length - 1) {
          const r = trending[Math.floor(Math.random() * trending.length)]
          setDisplayed(r)
          setSpinStep(s => s + 1)
        } else {
          setDisplayed(target)
          setSpinStep(s => s + 1)
          setSpinning(false)
          const wt = setTimeout(() => setWinner(target), 280)
          timeouts.current.push(wt)
        }
      }, elapsed)
      timeouts.current.push(t)
    })
  }, [spinning, spinPool, trending])

  const ringClass = spinning
    ? 'ring-accent shadow-[0_0_35px_rgba(99,102,241,0.45)]'
    : winner
    ? 'ring-green-400/60 shadow-[0_0_30px_rgba(74,222,128,0.2)]'
    : 'ring-cinema-navy-border'

  const poolHint =
    filteredPool.length === trending.length
      ? `${trending.length} movies in the pool`
      : `${spinPool.length} of ${trending.length} movies match your filters`

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <motion.div
          animate={spinning ? { rotate: [0, -15, 15, -15, 15, 0] } : { rotate: 0 }}
          transition={spinning ? { duration: 0.4, repeat: Infinity } : { duration: 0.3 }}
          className="inline-block text-6xl mb-4 select-none"
        >
          🎰
        </motion.div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold">Movie Roulette</h1>
        <p className="text-cinema-muted mt-3 text-base font-body max-w-sm mx-auto">
          Can't decide? Let fate pick tonight's watch.
        </p>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {!spinning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl mx-auto px-4 mb-8 space-y-3"
          >
            <div className="flex gap-2 justify-center flex-wrap">
              {(['all', 'movie', 'tv'] as TypeFilter[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setWinner(null) }}
                  className={`px-4 py-1.5 rounded-full text-sm font-body transition-all ${
                    typeFilter === t
                      ? 'accent-gradient text-white shadow-accent-glow'
                      : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
                </button>
              ))}
            </div>

            {availablePlatforms.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={() => { setPlatformFilter('all'); setWinner(null) }}
                  className={`px-4 py-1.5 rounded-full text-sm font-body transition-all ${
                    platformFilter === 'all'
                      ? 'accent-gradient text-white shadow-accent-glow'
                      : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text'
                  }`}
                >
                  Any platform
                </button>
                {availablePlatforms.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPlatformFilter(p); setWinner(null) }}
                    className={`px-4 py-1.5 rounded-full text-sm font-body transition-all ${
                      platformFilter === p ? 'text-white' : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text'
                    }`}
                    style={platformFilter === p ? { backgroundColor: getPlatformColor(p) } : {}}
                  >
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot machine */}
      <div className="flex flex-col items-center gap-6 px-4">
        <div className={`relative w-56 sm:w-64 rounded-2xl overflow-hidden ring-2 transition-all duration-500 ${ringClass}`}>
          {/* Scanning light bar */}
          {spinning && (
            <motion.div
              className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-accent/25 to-transparent z-20 pointer-events-none"
              animate={{ y: [-48, 390] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Poster display */}
          <div className="relative aspect-[2/3] bg-cinema-navy overflow-hidden">
            {isLoading ? (
              <div className="w-full h-full animate-pulse bg-cinema-surface" />
            ) : displayed?.posterUrl ? (
              <motion.img
                key={spinStep}
                src={displayed.posterUrl}
                alt={displayed.title}
                initial={spinning ? { opacity: 0.15 } : false}
                animate={{ opacity: spinning ? 1 : 1 }}
                transition={{ duration: 0.07 }}
                className={`w-full h-full object-cover transition-all duration-100 ${
                  spinning ? 'brightness-60 scale-105' : 'brightness-100 scale-100'
                }`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cinema-surface">
                <Dice6 size={48} className="text-cinema-muted" />
              </div>
            )}

            {/* Spinning overlay */}
            {spinning && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  className="text-white font-heading text-sm font-bold tracking-widest uppercase"
                >
                  Choosing...
                </motion.p>
              </div>
            )}

            {/* Winner badge */}
            {!spinning && winner && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="absolute top-3 right-3 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg"
              >
                ✨ Pick!
              </motion.div>
            )}

            {/* Idle title (before first spin) */}
            {!spinning && displayed && !spunOnce && (
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-cinema-black/90 to-transparent">
                <p className="font-heading text-white text-sm font-bold leading-tight line-clamp-2">
                  {displayed.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-cinema-muted text-xs">{displayed.voteAverage.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom accent bar */}
          <div
            className={`h-1 transition-colors duration-500 ${
              spinning ? 'bg-accent' : winner ? 'bg-green-400' : 'bg-cinema-navy-border'
            }`}
          />
        </div>

        {/* Spin button */}
        <motion.button
          onClick={spin}
          disabled={spinning || isLoading}
          whileHover={spinning ? {} : { scale: 1.04 }}
          whileTap={spinning ? {} : { scale: 0.96 }}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl accent-gradient text-white font-heading font-bold text-xl shadow-accent-glow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {spinning ? (
            <>
              <RotateCcw size={22} className="animate-spin" />
              Spinning...
            </>
          ) : (
            <>
              <Dice6 size={22} />
              {spunOnce ? 'Spin Again' : 'Spin!'}
            </>
          )}
        </motion.button>

        {!spinning && (
          <p className="text-cinema-muted/60 text-xs font-body">{poolHint}</p>
        )}
      </div>

      {/* Winner card */}
      <AnimatePresence>
        {winner && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="max-w-xl mx-auto mt-12 px-4"
          >
            <div className="rounded-2xl overflow-hidden border border-cinema-navy-border bg-cinema-navy/60 backdrop-blur-sm">
              {winner.backdropUrl ? (
                <div className="relative h-44 overflow-hidden">
                  <img src={winner.backdropUrl} alt={winner.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-navy via-cinema-navy/20 to-transparent" />
                </div>
              ) : (
                <div className="h-1.5 bg-gradient-to-r from-accent to-purple-500" />
              )}

              <div className="p-5 space-y-3">
                <p className="text-xs font-body font-medium text-accent uppercase tracking-widest">
                  🎰 Tonight's Pick
                </p>
                <h2 className="font-heading text-2xl font-bold leading-tight">{winner.title}</h2>

                <div className="flex items-center gap-3 text-sm text-cinema-muted font-body flex-wrap">
                  {winner.releaseDate && (
                    <span>{new Date(winner.releaseDate).getFullYear()}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    {winner.voteAverage.toFixed(1)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cinema-surface text-xs capitalize">
                    {winner.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                  </span>
                </div>

                {winner.overview && (
                  <p className="text-cinema-muted text-sm font-body line-clamp-3 leading-relaxed">
                    {winner.overview}
                  </p>
                )}

                {winner.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {winner.platforms.map(p => (
                      <span
                        key={p.platformName}
                        className="text-xs font-body font-semibold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: getPlatformColor(p.platformName) }}
                      >
                        {p.displayName}
                      </span>
                    ))}
                  </div>
                )}

                <WinnerActions winner={winner} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
