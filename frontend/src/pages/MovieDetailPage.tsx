import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Calendar, Tv2, BookmarkPlus, BookmarkCheck, ExternalLink, Play, X, Clock, User, Film, Share2, Check, Users, ChevronDown, Loader2 } from 'lucide-react'
import { ActorDrawer } from '@/components/movie/ActorDrawer'
import { GenreDrawer } from '@/components/movie/GenreDrawer'
import { ReviewSection } from '@/components/movie/ReviewSection'
import { ReviewSummaryCard } from '@/components/movie/ReviewSummaryCard'
import { useMovieDetail } from '@/hooks/useMovies'
import { useAddToWatchlist, useIsInWatchlist, useWatchlist } from '@/hooks/useWatchlist'
import { useMyGroups, useAddToGroupWatchlist } from '@/hooks/useGroups'
import { PlatformBadge } from '@/components/common/PlatformBadge'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

const PLACEHOLDER_BACKDROP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%230d1421'/%3E%3Crect x='6.1' y='3.3' width='3.8' height='2.4' rx='0.2' fill='none' stroke='%231d2c3e' stroke-width='0.12'/%3E%3Ccircle cx='7.1' cy='3.9' r='0.4' fill='%231d2c3e'/%3E%3Cpolygon points='6.1,5.7 7.6,4.3 8.6,4.9 9.9,4 9.9,5.7' fill='%231d2c3e'/%3E%3C/svg%3E"
const PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

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
  const [watchlistError, setWatchlistError] = useState<string | null>(null)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [shared, setShared] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [showAllCast, setShowAllCast] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const { addItem } = useRecentlyViewed()
  const { data: groups = [] } = useMyGroups()

  useEffect(() => {
    if (movie && user) addItem(movie)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.tmdbId, user?.uid])

  useEffect(() => {
    if (movie) document.title = `${movie.title} — WatchMate`
    return () => { document.title = 'WatchMate' }
  }, [movie?.title])

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
    setWatchlistError(null)
    try {
      await add({ movieId: movie.tmdbId, mediaType: movie.mediaType })
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code
      if (code === 'WATCHLIST_LIMIT_EXCEEDED') {
        setWatchlistError("You've reached the 5-item watchlist limit. Remove a title to add more.")
      }
    } finally {
      setAdding(false)
    }
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#01b4e4]/15 border border-[#01b4e4]/25 text-sm font-body font-semibold text-[#01b4e4]">
                  <span className="text-[10px] font-heading font-bold tracking-wide">TMDb</span>
                  <span className="w-px h-3 bg-[#01b4e4]/30" />
                  <Star size={12} fill="currentColor" />
                  {movie.voteAverage.toFixed(1)}
                  <span className="text-[#01b4e4]/60 font-normal text-xs">/10</span>
                  {movie.voteCount && movie.voteCount > 0 && (
                    <span className="text-cinema-muted font-normal text-xs">({movie.voteCount.toLocaleString()})</span>
                  )}
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

            {movie.releaseDate && (
              <p className="text-cinema-muted/70 text-xs font-body mb-4">
                <span className="text-cinema-muted/50 uppercase tracking-wider mr-1.5">Release date</span>
                {new Date(movie.releaseDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

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
                  Availability unknown — this title may not be indexed yet. Add to watchlist and we'll notify you when it lands on an Indian OTT platform.
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

              {user && groups.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowGroupPicker(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg glass text-cinema-muted hover:text-cinema-text font-body font-medium text-sm transition-all"
                  >
                    <Users size={16} /> Add to Group <ChevronDown size={13} />
                  </button>
                  {showGroupPicker && movie && (
                    <GroupPickerDropdown
                      tmdbId={movie.tmdbId}
                      mediaType={movie.mediaType}
                      groups={groups}
                      onClose={() => setShowGroupPicker(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {watchlistError && (
              <p className="text-sm font-body text-amber-400 flex items-center gap-1.5 -mt-1">
                <span>⚠</span> {watchlistError}
              </p>
            )}

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading font-semibold text-base text-cinema-text mb-3 flex items-center gap-2">
                  <User size={15} className="text-cinema-muted" /> Cast
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {(showAllCast ? movie.cast : movie.cast.slice(0, 12)).map((member) => (
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
                {movie.cast.length > 12 && (
                  <button
                    onClick={() => setShowAllCast((v) => !v)}
                    className="mt-2 text-xs font-body text-accent hover:text-accent/80 transition-colors"
                  >
                    {showAllCast ? 'Show less' : `Show all ${movie.cast.length} cast members`}
                  </button>
                )}
              </div>
            )}

            {/* Crew */}
            {movie.crew && movie.crew.length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading font-semibold text-base text-cinema-text mb-4 flex items-center gap-2">
                  <Film size={15} className="text-cinema-muted" /> Key Crew
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
                  {groupCrewByLabel(movie.crew).map(({ label, members }) => (
                    <div key={label} className="flex gap-3 items-baseline">
                      <span className="text-cinema-muted/60 font-body text-xs w-28 shrink-0">{label}</span>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {members.map((member) =>
                          member.personId ? (
                            <button
                              key={member.name}
                              onClick={() => {
                                if (!user) { signInWithGoogle(); return }
                                setSelectedPersonId(member.personId!)
                              }}
                              className="text-cinema-text font-body text-sm hover:text-accent transition-colors"
                            >
                              {member.name}
                            </button>
                          ) : (
                            <span key={member.name} className="text-cinema-text font-body text-sm">
                              {member.name}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <ReviewSummaryCard tmdbId={movie.tmdbId} mediaType={movie.mediaType} title={movie.title} />

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
            mediaType={movie?.mediaType}
            onClose={() => setSelectedGenre(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GroupPickerDropdown({
  tmdbId, mediaType, groups, onClose,
}: {
  tmdbId: number
  mediaType: string
  groups: import('@/types').GroupDto[]
  onClose: () => void
}) {
  const [addingGroupId, setAddingGroupId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // We need per-group mutation — use the hook at the first group level and call imperatively
  // Instead, we'll use individual add hooks lazily via a wrapper component
  return (
    <div className="absolute left-0 top-full mt-1 z-20 bg-cinema-navy border border-cinema-navy-border rounded-xl shadow-lg min-w-48 py-2 overflow-hidden">
      <p className="px-3 py-1 text-2xs font-body text-cinema-muted/50 uppercase tracking-wider">Add to group</p>
      {groups.map((group) => (
        <GroupPickerRow
          key={group.id}
          group={group}
          tmdbId={tmdbId}
          mediaType={mediaType}
          addingGroupId={addingGroupId}
          setAddingGroupId={setAddingGroupId}
          addedIds={addedIds}
          setAddedIds={setAddedIds}
          setError={setError}
        />
      ))}
      {error && <p className="px-3 pb-2 text-xs text-red-400 font-body">{error}</p>}
      <div className="border-t border-cinema-navy-border mt-1 pt-1">
        <button
          onClick={onClose}
          className="w-full px-3 py-1.5 text-left text-xs text-cinema-muted/50 hover:text-cinema-muted font-body transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function GroupPickerRow({
  group, tmdbId, mediaType, addingGroupId, setAddingGroupId, addedIds, setAddedIds, setError,
}: {
  group: import('@/types').GroupDto
  tmdbId: number
  mediaType: string
  addingGroupId: number | null
  setAddingGroupId: (id: number | null) => void
  addedIds: Set<number>
  setAddedIds: (ids: Set<number>) => void
  setError: (e: string | null) => void
}) {
  const { mutateAsync: addToGroup } = useAddToGroupWatchlist(group.id)
  const isAdding = addingGroupId === group.id
  const isAdded = addedIds.has(group.id)

  async function handleAdd() {
    if (isAdded || isAdding) return
    setError(null)
    setAddingGroupId(group.id)
    try {
      await addToGroup({ tmdbId, mediaType })
      setAddedIds(new Set([...addedIds, group.id]))
    } catch {
      setError('Already in this group or failed to add.')
    } finally {
      setAddingGroupId(null)
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isAdding || isAdded}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-cinema-surface transition-colors disabled:opacity-60"
    >
      {isAdding ? (
        <Loader2 size={13} className="text-cinema-muted animate-spin shrink-0" />
      ) : isAdded ? (
        <Check size={13} className="text-green-400 shrink-0" />
      ) : (
        <Users size={13} className="text-cinema-muted/50 shrink-0" />
      )}
      <span className="text-cinema-text font-body text-sm truncate">{group.name}</span>
    </button>
  )
}

const WRITING_JOBS = new Set(['Screenplay', 'Writer', 'Story', 'Screenstory'])
const JOB_LABELS: Record<string, string> = {
  'Director': 'Directed by',
  'Creator': 'Created by',
  'Director of Photography': 'Cinematography',
  'Original Music Composer': 'Music',
}
const LABEL_ORDER = ['Directed by', 'Created by', 'Written by', 'Cinematography', 'Music']

function groupCrewByLabel(crew: import('@/types').CrewMember[]) {
  const groups = new Map<string, import('@/types').CrewMember[]>()
  for (const member of crew) {
    const label = WRITING_JOBS.has(member.job)
      ? 'Written by'
      : (JOB_LABELS[member.job] ?? member.job)
    if (!groups.has(label)) groups.set(label, [])
    if (!groups.get(label)!.find((m) => m.name === member.name)) {
      groups.get(label)!.push(member)
    }
  }
  const result: { label: string; members: import('@/types').CrewMember[] }[] = []
  for (const label of LABEL_ORDER) {
    if (groups.has(label)) result.push({ label, members: groups.get(label)! })
  }
  for (const [label, members] of groups) {
    if (!LABEL_ORDER.includes(label)) result.push({ label, members })
  }
  return result
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
