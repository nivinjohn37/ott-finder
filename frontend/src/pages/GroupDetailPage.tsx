import { useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Crown, Trophy, Lightbulb, ThumbsUp, ThumbsDown,
  CheckCircle2, Circle, Loader2, LogOut, Star, Search, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  useGroup, useGroupWatchlist, useToggleGroupWatched,
  useLeaderboard, useGroupSuggestions, useVoteOnSuggestion,
  useLeaveGroup, useSuggestMovie,
} from '@/hooks/useGroups'
import { useSearch } from '@/hooks/useMovies'
import type { GroupWatchlistItemDto, LeaderboardEntryDto, GroupSuggestionDto, MovieSearchResult } from '@/types'

type Tab = 'watchlist' | 'leaderboard' | 'suggestions'

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const id = Number(groupId)
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('watchlist')

  if (!user) return <Navigate to="/" replace />
  if (!id) return <Navigate to="/groups" replace />

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <GroupHeader groupId={id} />

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-cinema-navy rounded-xl border border-cinema-navy-border mb-6">
        {([
          { key: 'watchlist', label: 'Watchlist', Icon: CheckCircle2 },
          { key: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
          { key: 'suggestions', label: 'Suggestions', Icon: Lightbulb },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body font-semibold transition-all ${
              tab === key
                ? 'accent-gradient text-white shadow-sm'
                : 'text-cinema-muted hover:text-cinema-text'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'watchlist' && <WatchlistTab groupId={id} />}
          {tab === 'leaderboard' && <LeaderboardTab groupId={id} />}
          {tab === 'suggestions' && <SuggestionsTab groupId={id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ─── Group Header ─────────────────────────────────────────────────────────── */
function GroupHeader({ groupId }: { groupId: number }) {
  const { data: group, isLoading } = useGroup(groupId)
  const { mutateAsync: leave, isPending: leaving } = useLeaveGroup(groupId)
  const [showLeave, setShowLeave] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return (
    <div className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-5 mb-6 animate-pulse h-24" />
  )
  if (!group) return null

  async function handleLeave() {
    await leave()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cinema-navy border border-cinema-navy-border rounded-xl p-5 mb-6"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/groups"
            className="p-1.5 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-cinema-surface transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {group.isAdmin && <Crown size={13} className="text-yellow-400 shrink-0" />}
              <h1 className="font-heading font-bold text-xl text-cinema-text">{group.name}</h1>
            </div>
            <p className="text-cinema-muted/60 text-xs font-body mt-0.5">
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              {' · '}
              <span className="font-mono tracking-widest">{group.inviteCode}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLeave(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-body transition-colors shrink-0"
        >
          <LogOut size={13} /> Leave
        </button>
      </div>

      {/* Members preview */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-xs text-cinema-muted/60 font-body hover:text-cinema-muted transition-colors"
      >
        <Users size={12} />
        {expanded ? 'Hide members' : 'Show members'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5">
              {group.members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2 text-xs font-body">
                  <div className="w-5 h-5 rounded-full accent-gradient flex items-center justify-center text-[9px] text-white font-bold">
                    {(m.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-cinema-text">{m.displayName}</span>
                  {m.role === 'admin' && <Crown size={10} className="text-yellow-400" />}
                  <span className="text-cinema-muted/40">{m.role}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave confirm */}
      <AnimatePresence>
        {showLeave && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
          >
            <p className="text-red-400 text-sm font-body mb-3">
              Are you sure you want to leave <strong>{group.name}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-body font-semibold disabled:opacity-50"
              >
                {leaving && <Loader2 size={11} className="animate-spin" />}
                Yes, leave
              </button>
              <button
                onClick={() => setShowLeave(false)}
                className="px-3 py-1.5 rounded-lg text-cinema-muted text-xs font-body hover:text-cinema-text"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Watchlist Tab ────────────────────────────────────────────────────────── */
function WatchlistTab({ groupId }: { groupId: number }) {
  const { data: items = [], isLoading } = useGroupWatchlist(groupId)

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 animate-pulse h-28" />
      ))}
    </div>
  )

  if (items.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2 size={36} className="text-cinema-muted/30" />
      <div>
        <p className="font-heading font-semibold text-cinema-text">No movies yet</p>
        <p className="text-cinema-muted/60 text-sm font-body mt-1">
          Add movies from their detail pages.
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <WatchlistItemCard groupId={groupId} item={item} />
        </motion.div>
      ))}
    </div>
  )
}

function WatchlistItemCard({ groupId, item }: { groupId: number; item: GroupWatchlistItemDto }) {
  const { mutateAsync: toggle, isPending } = useToggleGroupWatched(groupId)
  const [showProgress, setShowProgress] = useState(false)
  const pct = item.totalMembers > 0 ? Math.round((item.watchedCount / item.totalMembers) * 100) : 0

  return (
    <div className="bg-cinema-navy border border-cinema-navy-border rounded-xl overflow-hidden">
      <div className="flex gap-3 p-4">
        {/* Poster */}
        <Link to={`/movie/${item.movie.tmdbId}?type=${item.movie.mediaType}`} className="shrink-0">
          <div className="w-14 h-20 rounded-lg overflow-hidden bg-cinema-surface border border-cinema-navy-border">
            {item.movie.posterUrl ? (
              <img src={item.movie.posterUrl} alt={item.movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cinema-muted/30">
                <Star size={16} />
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/movie/${item.movie.tmdbId}?type=${item.movie.mediaType}`}>
            <h3 className="font-heading font-bold text-cinema-text text-sm leading-tight hover:text-accent transition-colors line-clamp-2">
              {item.movie.title}
            </h3>
          </Link>
          <p className="text-cinema-muted/50 text-xs font-body mt-0.5">
            Added by {item.addedByName}
          </p>

          {/* Progress bar */}
          <div className="mt-2 mb-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setShowProgress(v => !v)}
                className="text-xs text-cinema-muted/60 font-body hover:text-cinema-muted transition-colors flex items-center gap-1"
              >
                <Users size={11} />
                {item.watchedCount}/{item.totalMembers} watched
              </button>
              <span className="text-xs text-cinema-muted/40 font-mono">{pct}%</span>
            </div>
            <div className="h-1 bg-cinema-surface rounded-full overflow-hidden">
              <div
                className="h-full accent-gradient rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Watched toggle */}
        <button
          onClick={() => toggle(item.id)}
          disabled={isPending}
          className={`shrink-0 flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
            item.currentUserWatched
              ? 'text-green-400'
              : 'text-cinema-muted/40 hover:text-cinema-muted'
          }`}
          title={item.currentUserWatched ? 'Mark unwatched' : 'Mark watched'}
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : item.currentUserWatched ? (
            <CheckCircle2 size={18} />
          ) : (
            <Circle size={18} />
          )}
          <span className="text-[10px] font-body">{item.currentUserWatched ? 'Watched' : 'Watch'}</span>
        </button>
      </div>

      {/* Member progress detail */}
      <AnimatePresence>
        {showProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-cinema-navy-border"
          >
            <div className="px-4 py-3 grid grid-cols-2 gap-1.5">
              {item.progress.map((p) => (
                <div key={p.displayName} className="flex items-center gap-2 text-xs font-body">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    p.watched ? 'bg-green-500/20 text-green-400' : 'bg-cinema-surface text-cinema-muted/30'
                  }`}>
                    {p.watched ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                  </div>
                  <span className={p.watched ? 'text-cinema-text' : 'text-cinema-muted/50'}>
                    {p.displayName}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Leaderboard Tab ──────────────────────────────────────────────────────── */
function LeaderboardTab({ groupId }: { groupId: number }) {
  const { data: entries = [], isLoading } = useLeaderboard(groupId)

  if (isLoading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 animate-pulse h-16" />
      ))}
    </div>
  )

  if (entries.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Trophy size={36} className="text-cinema-muted/30" />
      <p className="font-heading font-semibold text-cinema-text">No data yet</p>
      <p className="text-cinema-muted/60 text-sm font-body">Watch some movies to start competing!</p>
    </div>
  )

  const rankStyle: Record<number, string> = {
    1: 'text-yellow-400 font-bold',
    2: 'text-slate-300 font-bold',
    3: 'text-amber-600 font-bold',
  }
  const rankBg: Record<number, string> = {
    1: 'bg-yellow-400/10 border-yellow-400/30',
    2: 'bg-slate-300/10 border-slate-300/30',
    3: 'bg-amber-600/10 border-amber-600/30',
  }
  const rankIcon: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="space-y-2">
      {entries.map((entry: LeaderboardEntryDto, i) => (
        <motion.div
          key={entry.userId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            rankBg[entry.rank] ?? 'bg-cinema-navy border-cinema-navy-border'
          }`}
        >
          {/* Rank */}
          <div className="w-8 text-center shrink-0">
            {rankIcon[entry.rank] ? (
              <span className="text-xl">{rankIcon[entry.rank]}</span>
            ) : (
              <span className={`text-base font-heading ${rankStyle[entry.rank] ?? 'text-cinema-muted'}`}>
                #{entry.rank}
              </span>
            )}
          </div>

          {/* Avatar + Name */}
          <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-xs text-white font-bold shrink-0">
            {(entry.displayName || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-sm text-cinema-text truncate">
              {entry.displayName}
            </p>
            <p className="text-cinema-muted/50 text-xs font-body">
              {entry.watchedCount} / {entry.totalItems} watched
            </p>
          </div>

          {/* Progress */}
          <div className="shrink-0 text-right">
            <p className={`font-heading font-bold text-lg leading-none ${rankStyle[entry.rank] ?? 'text-cinema-text'}`}>
              {entry.percentage}%
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Suggestions Tab ──────────────────────────────────────────────────────── */
function SuggestionsTab({ groupId }: { groupId: number }) {
  const { data: suggestions = [], isLoading } = useGroupSuggestions(groupId)
  const [showSuggest, setShowSuggest] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-cinema-muted/60 text-sm font-body">
          Suggest movies for the group to watch next.
        </p>
        <button
          onClick={() => setShowSuggest(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg accent-gradient text-white text-xs font-body font-semibold"
        >
          <Lightbulb size={12} /> Suggest
        </button>
      </div>

      {/* Suggest search panel */}
      <AnimatePresence>
        {showSuggest && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5"
          >
            <SuggestMoviePanel groupId={groupId} onDone={() => setShowSuggest(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Lightbulb size={36} className="text-cinema-muted/30" />
          <div>
            <p className="font-heading font-semibold text-cinema-text">No suggestions yet</p>
            <p className="text-cinema-muted/60 text-sm font-body mt-1">Be the first to suggest something!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <SuggestionCard groupId={groupId} suggestion={s} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestMoviePanel({ groupId, onDone }: { groupId: number; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { mutateAsync: suggest, isPending } = useSuggestMovie(groupId)
  const { data: results = [], isFetching } = useSearch(debouncedQuery)
  const [error, setError] = useState<string | null>(null)

  // Simple debounce via timeout
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)
  function handleQueryChange(val: string) {
    setQuery(val)
    if (timeoutId) clearTimeout(timeoutId)
    const id = setTimeout(() => setDebouncedQuery(val), 350)
    setTimeoutId(id)
  }

  async function handleSuggest(movie: MovieSearchResult) {
    setError(null)
    try {
      await suggest({ tmdbId: movie.tmdbId, mediaType: movie.mediaType })
      onDone()
    } catch {
      setError('Already suggested or failed to suggest.')
    }
  }

  return (
    <div className="bg-cinema-navy border border-accent/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="font-heading font-semibold text-cinema-text text-sm flex-1">Suggest a movie</p>
        <button onClick={onDone} className="text-cinema-muted hover:text-cinema-text">
          <X size={15} />
        </button>
      </div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cinema-muted/50" />
        <input
          autoFocus
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search for a movie or show…"
          className="w-full pl-9 pr-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/40 focus:outline-none focus:border-accent/60"
        />
        {isFetching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-muted animate-spin" />
        )}
      </div>
      {error && <p className="text-red-400 text-xs font-body mb-2">{error}</p>}
      {debouncedQuery && results.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
          {results.slice(0, 8).map((movie: MovieSearchResult) => (
            <button
              key={movie.tmdbId}
              onClick={() => handleSuggest(movie)}
              disabled={isPending}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-cinema-surface transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-11 rounded overflow-hidden bg-cinema-surface border border-cinema-navy-border shrink-0">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cinema-muted/30">
                    <Star size={10} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cinema-text font-body text-sm font-medium truncate">{movie.title}</p>
                <p className="text-cinema-muted/50 text-xs font-body">
                  {movie.releaseDate?.slice(0, 4)} · {movie.mediaType === 'tv' ? 'TV' : 'Movie'}
                </p>
              </div>
              {isPending ? (
                <Loader2 size={13} className="text-cinema-muted animate-spin shrink-0" />
              ) : (
                <Lightbulb size={13} className="text-cinema-muted/40 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
      {debouncedQuery && results.length === 0 && !isFetching && (
        <p className="text-cinema-muted/50 text-xs font-body text-center py-3">No results found.</p>
      )}
    </div>
  )
}

function SuggestionCard({ groupId, suggestion }: { groupId: number; suggestion: GroupSuggestionDto }) {
  const { mutateAsync: vote, isPending } = useVoteOnSuggestion(groupId)
  const score = suggestion.upvotes - suggestion.downvotes

  async function handleVote(v: 1 | -1) {
    try {
      await vote({ suggestionId: suggestion.id, vote: v })
    } catch { /* swallow */ }
  }

  return (
    <div className="bg-cinema-navy border border-cinema-navy-border rounded-xl p-4 flex gap-3">
      {/* Poster */}
      <Link to={`/movie/${suggestion.movie.tmdbId}?type=${suggestion.movie.mediaType}`} className="shrink-0">
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-cinema-surface border border-cinema-navy-border">
          {suggestion.movie.posterUrl ? (
            <img src={suggestion.movie.posterUrl} alt={suggestion.movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cinema-muted/30">
              <Star size={14} />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/movie/${suggestion.movie.tmdbId}?type=${suggestion.movie.mediaType}`}>
          <h3 className="font-heading font-bold text-cinema-text text-sm leading-tight hover:text-accent transition-colors line-clamp-2">
            {suggestion.movie.title}
          </h3>
        </Link>
        <p className="text-cinema-muted/50 text-xs font-body mt-0.5">
          Suggested by {suggestion.suggestedByName}
        </p>

        {/* Vote row */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleVote(1)}
            disabled={isPending}
            className={`flex items-center gap-1 text-xs font-body transition-colors ${
              suggestion.currentUserVote === 1
                ? 'text-green-400'
                : 'text-cinema-muted/50 hover:text-green-400'
            }`}
          >
            <ThumbsUp size={13} /> {suggestion.upvotes}
          </button>
          <button
            onClick={() => handleVote(-1)}
            disabled={isPending}
            className={`flex items-center gap-1 text-xs font-body transition-colors ${
              suggestion.currentUserVote === -1
                ? 'text-red-400'
                : 'text-cinema-muted/50 hover:text-red-400'
            }`}
          >
            <ThumbsDown size={13} /> {suggestion.downvotes}
          </button>
          <span className={`text-xs font-body font-semibold ${
            score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-cinema-muted/50'
          }`}>
            {score > 0 ? '+' : ''}{score}
          </span>
        </div>
      </div>
    </div>
  )
}
