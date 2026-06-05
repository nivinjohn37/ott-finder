import { motion, AnimatePresence } from 'framer-motion'
import { Navigate, Link } from 'react-router-dom'
import {
  Users, Film, Bookmark, Tv2, Search, Check, AlertCircle, Loader2,
  ShieldCheck, Database, X, Star, Ban, RotateCcw, Trash2, BarChart2,
  MessageSquare, ChevronLeft, ChevronRight, ExternalLink, Group, Flag, Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  useCurrentUser, useAdminStats, useAdminPlatforms, useAdminUsers,
  useSeedAvailability, useToggleBlacklist, useMovieAvailability,
  useDeleteAvailability, useAdminReviews, useDeleteAdminReview,
  useAdminContentStats, useAiUsageStats,
} from '@/hooks/useUser'
import { searchMovies } from '@/api/movies'
import type { AdminUserDto, AdminReviewDto, AiFeatureStat, MovieSearchResult } from '@/types'

type Tab = 'overview' | 'content' | 'reviews' | 'platforms' | 'ai'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'overview',  label: 'Overview',  icon: <Database size={15} /> },
  { id: 'content',   label: 'Content',   icon: <BarChart2 size={15} /> },
  { id: 'reviews',   label: 'Reviews',   icon: <MessageSquare size={15} /> },
  { id: 'platforms', label: 'Platforms', icon: <Tv2 size={15} /> },
  { id: 'ai',        label: 'AI Usage',  icon: <Sparkles size={15} /> },
]

export function AdminPage() {
  const { user } = useAuth()
  const { data: me, isLoading: meLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (!user || (!meLoading && me?.role !== 'admin')) {
    return <Navigate to="/" replace />
  }

  if (meLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck size={22} className="text-accent" />
          <h1 className="font-heading font-bold text-2xl text-cinema-text">Admin Dashboard</h1>
        </div>
        <p className="text-cinema-muted font-body text-sm ml-9">Logged in as {me?.email}</p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b border-cinema-navy-border overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-cinema-muted hover:text-cinema-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview'  && <OverviewTab />}
          {activeTab === 'content'   && <ContentTab />}
          {activeTab === 'reviews'   && <ReviewsTab />}
          {activeTab === 'platforms' && <PlatformsTab />}
          {activeTab === 'ai'        && <AiUsageTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useAdminStats()
  const [showUsers, setShowUsers] = useState(false)

  const cards = [
    { icon: <Users size={18} />,    label: 'Total Users',       value: stats?.totalUsers,           clickable: true,  onClick: () => setShowUsers(true) },
    { icon: <Bookmark size={18} />, label: 'Watchlist Entries', value: stats?.totalWatchlistEntries, clickable: false, onClick: undefined },
    { icon: <Film size={18} />,     label: 'Movies in DB',      value: stats?.totalMoviesInDb,       clickable: false, onClick: undefined },
    { icon: <Tv2 size={18} />,      label: 'OTT Platforms',     value: stats?.totalPlatforms,        clickable: false, onClick: undefined },
    { icon: <MessageSquare size={18} />, label: 'Total Reviews', value: stats?.totalReviews,         clickable: false, onClick: undefined },
    { icon: <Group size={18} />,    label: 'Active Groups',     value: stats?.activeGroups,          clickable: false, onClick: undefined },
  ]

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading icon={<Database size={16} />} title="Platform Stats" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {cards.map(({ icon, label, value, clickable, onClick }) => (
            <div
              key={label}
              onClick={onClick}
              className={`bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 space-y-2 ${
                clickable ? 'cursor-pointer hover:border-accent/40 hover:bg-cinema-navy-hover transition-colors' : ''
              }`}
            >
              <div className="text-cinema-muted">{icon}</div>
              <div className="font-heading font-bold text-2xl text-cinema-text">
                {isLoading ? '—' : value?.toLocaleString() ?? '—'}
              </div>
              <div className="text-cinema-muted/60 text-xs font-body">
                {label}{clickable && <span className="ml-1 text-accent/50">↗</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showUsers && <UserListModal onClose={() => setShowUsers(false)} />}
      </AnimatePresence>
    </div>
  )
}

function UserListModal({ onClose }: { onClose: () => void }) {
  const { data: users = [], isLoading } = useAdminUsers()

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-cinema-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-3xl bg-cinema-navy border border-cinema-navy-border rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-navy-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <h2 className="font-heading font-semibold text-cinema-text">All Users</h2>
            <span className="text-cinema-muted/50 text-sm font-body">({users.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-cinema-muted hover:text-cinema-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="text-accent animate-spin" /></div>
          ) : users.length === 0 ? (
            <p className="text-cinema-muted text-sm font-body text-center py-12">No users yet.</p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead className="sticky top-0 bg-cinema-navy border-b border-cinema-navy-border">
                <tr>
                  {['User', 'Role', 'Joined', 'Watchlist', 'Reviews', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-cinema-muted/60 text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cinema-navy-border">
                {users.map((u) => <UserRow key={u.id} user={u} />)}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function UserRow({ user }: { user: AdminUserDto }) {
  const { mutate: toggleBlacklist, isPending } = useToggleBlacklist()

  return (
    <tr className={`hover:bg-cinema-surface/40 transition-colors ${user.blacklisted ? 'opacity-60' : ''}`}>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold shrink-0 ${user.blacklisted ? 'bg-red-500/50' : 'accent-gradient'}`}>
            {(user.displayName ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-cinema-text font-medium truncate">{user.displayName ?? '—'}</p>
            <p className="text-cinema-muted/60 text-xs truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          user.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-cinema-surface text-cinema-muted'
        }`}>
          {user.role === 'admin' && <Star size={10} className="fill-accent" />}
          {user.role}
        </span>
      </td>
      <td className="px-6 py-3 text-cinema-muted text-xs">
        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td className="px-6 py-3 text-cinema-text font-medium">{user.watchlistCount}</td>
      <td className="px-6 py-3 text-cinema-text font-medium">{user.reviewCount}</td>
      <td className="px-6 py-3">
        {user.role !== 'admin' && (
          <button
            onClick={() => toggleBlacklist(user.id)}
            disabled={isPending}
            title={user.blacklisted ? 'Reinstate user' : 'Blacklist user'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-body font-medium transition-colors disabled:opacity-40 ${
              user.blacklisted
                ? 'bg-green-400/15 text-green-400 hover:bg-green-400/25'
                : 'bg-red-400/15 text-red-400 hover:bg-red-400/25'
            }`}
          >
            {isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : user.blacklisted ? (
              <><RotateCcw size={12} /> Reinstate</>
            ) : (
              <><Ban size={12} /> Blacklist</>
            )}
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Content tab ──────────────────────────────────────────────────────────────

function ContentTab() {
  const { data, isLoading } = useAdminContentStats()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    )
  }

  const totalRatings = data?.ratingDistribution.reduce((sum, b) => sum + b.count, 0) ?? 0
  const maxReviews = Math.max(...(data?.topReviewedMovies.map(m => m.reviewCount) ?? [1]), 1)
  const maxPlatform = Math.max(...(data?.topPlatforms.map(p => p.count) ?? [1]), 1)

  return (
    <div className="space-y-10">
      {/* Most reviewed movies */}
      <div>
        <SectionHeading icon={<Film size={16} />} title="Most Reviewed Movies" />
        {!data?.topReviewedMovies.length ? (
          <p className="text-cinema-muted/60 text-sm font-body">No reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {data.topReviewedMovies.map((movie, i) => (
              <div key={movie.tmdbId} className="flex items-center gap-3">
                <span className="text-cinema-muted/40 font-body text-xs w-5 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <Link
                      to={`/movie/${movie.tmdbId}`}
                      className="text-cinema-text font-body text-sm font-medium truncate hover:text-accent transition-colors"
                    >
                      {movie.title}
                    </Link>
                    <span className="text-cinema-muted/60 text-xs font-body shrink-0">
                      {movie.reviewCount} review{movie.reviewCount !== 1 ? 's' : ''} · ★ {movie.avgRating.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cinema-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/60"
                      style={{ width: `${(movie.reviewCount / maxReviews) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating distribution */}
      <div>
        <SectionHeading icon={<Star size={16} />} title="Rating Distribution" />
        {!data?.ratingDistribution.length ? (
          <p className="text-cinema-muted/60 text-sm font-body">No reviews yet.</p>
        ) : (
          <div className="space-y-2 max-w-md">
            {[5, 4, 3, 2, 1].map((star) => {
              const bucket = data.ratingDistribution.find(b => b.rating === star)
              const count = bucket?.count ?? 0
              const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-cinema-muted text-sm font-body w-10 shrink-0">
                    {'★'.repeat(star)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-cinema-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-cinema-muted/60 text-xs font-body w-8 text-right shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top platforms */}
      <div>
        <SectionHeading icon={<Tv2 size={16} />} title="OTT Platforms by Availability" />
        {!data?.topPlatforms.length ? (
          <p className="text-cinema-muted/60 text-sm font-body">No availability data yet.</p>
        ) : (
          <div className="space-y-2 max-w-md">
            {data.topPlatforms.map((p) => (
              <div key={p.displayName} className="flex items-center gap-3">
                <span className="text-cinema-text font-body text-sm w-32 truncate shrink-0">{p.displayName}</span>
                <div className="flex-1 h-2 rounded-full bg-cinema-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${(p.count / maxPlatform) * 100}%` }}
                  />
                </div>
                <span className="text-cinema-muted/60 text-xs font-body w-8 text-right shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reviews tab ──────────────────────────────────────────────────────────────

const RATING_OPTIONS = [0, 1, 2, 3, 4, 5]

function ReviewsTab() {
  const [page, setPage] = useState(0)
  const [ratingFilter, setRatingFilter] = useState(0)
  const [reportedOnly, setReportedOnly] = useState(false)
  const [search, setSearch] = useState('')

  const filters = {
    ...(ratingFilter > 0 && { ratingFilter }),
    ...(reportedOnly && { reportedOnly }),
  }
  const { data, isLoading } = useAdminReviews(page, filters)
  const { mutate: deleteReview, isPending: deleting, variables: deletingId } = useDeleteAdminReview()

  function applyFilter(newRating: number, newReported: boolean) {
    setPage(0)
    setRatingFilter(newRating)
    setReportedOnly(newReported)
  }

  const displayed = search.trim()
    ? (data?.reviews ?? []).filter(r =>
        r.movieTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.userDisplayName.toLowerCase().includes(search.toLowerCase()) ||
        r.userEmail.toLowerCase().includes(search.toLowerCase())
      )
    : (data?.reviews ?? [])

  return (
    <div className="space-y-4">
      <SectionHeading icon={<MessageSquare size={16} />} title="All Reviews" />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Rating chips */}
        <div className="flex items-center gap-1">
          {RATING_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => applyFilter(r, reportedOnly)}
              className={`px-2.5 py-1 rounded-full text-xs font-body font-medium transition-colors ${
                ratingFilter === r
                  ? 'bg-accent text-white'
                  : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text'
              }`}
            >
              {r === 0 ? 'All' : '★'.repeat(r)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-cinema-navy-border" />

        {/* Reported toggle */}
        <button
          onClick={() => applyFilter(ratingFilter, !reportedOnly)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium transition-colors ${
            reportedOnly
              ? 'bg-red-400/15 text-red-400 border border-red-400/30'
              : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text'
          }`}
        >
          <Flag size={11} /> Reported only
        </button>

        {/* Search */}
        <div className="ml-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search movie or user…"
            className="px-3 py-1.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-xs placeholder:text-cinema-muted/50 focus:outline-none focus:border-accent/60 w-44"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="text-accent animate-spin" />
        </div>
      ) : !displayed.length ? (
        <p className="text-cinema-muted/60 text-sm font-body py-8 text-center">No reviews match these filters.</p>
      ) : (
        <>
          <div className="rounded-xl border border-cinema-navy-border overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-cinema-navy border-b border-cinema-navy-border">
                <tr>
                  {['Movie', 'User', 'Rating', 'Review', 'Likes', 'Reports', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-cinema-muted/60 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cinema-navy-border bg-cinema-surface/20">
                {displayed.map((r) => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    onDelete={() => deleteReview(r.id)}
                    isDeleting={deleting && deletingId === r.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && !search && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-cinema-muted/60 text-xs font-body">
                {data!.totalElements} total · page {page + 1} of {data!.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data!.totalPages - 1, p + 1))}
                  disabled={page >= data!.totalPages - 1}
                  className="p-1.5 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReviewRow({
  review,
  onDelete,
  isDeleting,
}: {
  review: AdminReviewDto
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <tr className={`hover:bg-cinema-surface/40 transition-colors ${review.reportCount > 0 ? 'bg-red-400/5' : ''}`}>
      <td className="px-4 py-3 max-w-[160px]">
        <Link
          to={`/movie/${review.movieTmdbId}`}
          className="text-cinema-text text-sm font-medium hover:text-accent transition-colors flex items-center gap-1 truncate"
        >
          {review.movieTitle}
          <ExternalLink size={11} className="shrink-0 opacity-40" />
        </Link>
      </td>
      <td className="px-4 py-3 max-w-[140px]">
        <p className="text-cinema-text text-xs font-medium truncate">{review.userDisplayName}</p>
        <p className="text-cinema-muted/50 text-xs truncate">{review.userEmail}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-yellow-400 font-body font-semibold text-sm">{'★'.repeat(review.rating)}</span>
        <span className="text-cinema-muted/30 text-sm">{'☆'.repeat(5 - review.rating)}</span>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-cinema-muted text-xs line-clamp-2">
          {review.note ?? <span className="italic opacity-40">No text</span>}
        </p>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-cinema-muted text-xs font-body font-medium">
          {review.likeCount > 0 ? `👍 ${review.likeCount}` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {review.reportCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 text-xs font-body font-semibold">
            <Flag size={10} /> {review.reportCount}
          </span>
        ) : (
          <span className="text-cinema-muted/30 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-cinema-muted/60 text-xs whitespace-nowrap">
        {new Date(review.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Delete review"
          className="p-1.5 rounded-lg text-cinema-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </td>
    </tr>
  )
}

// ─── Platforms tab ────────────────────────────────────────────────────────────

function PlatformsTab() {
  return (
    <div className="space-y-2">
      <SectionHeading icon={<Tv2 size={16} />} title="Seed OTT Availability" />
      <p className="text-cinema-muted/60 text-xs font-body mb-4">
        Manually add platform availability for movies JustWatch misses (e.g. Indian regional films).
      </p>
      <SeedForm />
    </div>
  )
}

function ExistingEntries({ tmdbId }: { tmdbId: number }) {
  const { data: entries = [], isLoading } = useMovieAvailability(tmdbId)
  const { mutateAsync: remove, isPending } = useDeleteAvailability()

  if (isLoading) return <p className="text-cinema-muted/50 text-xs font-body mt-2">Loading existing entries…</p>
  if (entries.length === 0) return <p className="text-cinema-muted/50 text-xs font-body mt-2">No seeded entries for this title.</p>

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider">Existing entries</p>
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cinema-surface border border-cinema-navy-border">
          <span className="flex-1 text-cinema-text font-body text-sm">{entry.displayName}</span>
          {entry.deepLink && (
            <a href={entry.deepLink} target="_blank" rel="noopener noreferrer"
              className="text-cinema-muted/60 text-xs font-body hover:text-accent truncate max-w-[140px]">
              {entry.deepLink}
            </a>
          )}
          {entry.availableUntil && (
            <span className="text-cinema-muted/60 text-xs font-body shrink-0">
              until {new Date(entry.availableUntil).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={() => remove(entry.id)}
            disabled={isPending}
            className="p-1 rounded text-cinema-muted hover:text-red-400 transition-colors shrink-0"
            title="Delete entry"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      ))}
    </div>
  )
}

function SeedForm() {
  const { data: platforms = [] } = useAdminPlatforms()
  const { mutateAsync: seed, isPending } = useSeedAvailability()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<MovieSearchResult[]>([])
  const [selected, setSelected] = useState<MovieSearchResult | null>(null)
  const [platform, setPlatform] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSearch() {
    if (query.trim().length < 2) return
    setSearching(true)
    setResults([])
    setSelected(null)
    try {
      const res = await searchMovies(query.trim())
      setResults(res.slice(0, 8))
    } finally {
      setSearching(false)
    }
  }

  async function handleSeed() {
    if (!selected || !platform) return
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const msg = await seed({
        tmdbId: selected.tmdbId,
        mediaType: selected.mediaType,
        platformName: platform,
        deepLink: deepLink || undefined,
        availableUntil: availableUntil || undefined,
      })
      setSuccessMsg(msg)
      setSelected(null)
      setQuery('')
      setResults([])
      setDeepLink('')
      setAvailableUntil('')
      setPlatform('')
    } catch {
      setErrorMsg('Seeding failed. Check the console for details.')
    }
  }

  return (
    <div className="bg-cinema-navy border border-cinema-navy-border rounded-xl p-5 space-y-5">
      {/* Step 1 — Search movie */}
      <div>
        <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
          1. Search for a movie or show
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Kantara, Ponniyin Selvan…"
            className="flex-1 px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
          <button
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="px-4 py-2.5 rounded-lg accent-gradient text-white font-body text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        {results.length > 0 && !selected && (
          <div className="mt-2 rounded-lg border border-cinema-navy-border overflow-hidden divide-y divide-cinema-navy-border">
            {results.map((r) => (
              <button
                key={`${r.tmdbId}-${r.mediaType}`}
                onClick={() => { setSelected(r); setResults([]) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cinema-navy-hover transition-colors text-left"
              >
                <div className="w-8 h-12 rounded overflow-hidden bg-cinema-surface shrink-0">
                  {r.posterUrl
                    ? <img src={r.posterUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-cinema-muted/30"><Film size={14} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cinema-text font-body text-sm font-medium truncate">{r.title}</p>
                  <p className="text-cinema-muted/60 text-xs font-body">
                    {r.releaseDate?.slice(0, 4) ?? '—'} · {r.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
              <Check size={14} className="text-accent shrink-0" />
              <span className="text-accent font-body text-sm font-medium flex-1 truncate">{selected.title}</span>
              <span className="text-accent/60 text-xs font-body">{selected.mediaType === 'tv' ? 'TV' : 'Movie'} · {selected.releaseDate?.slice(0, 4)}</span>
              <button onClick={() => setSelected(null)} className="text-cinema-muted hover:text-cinema-text ml-1 text-xs font-body">change</button>
            </div>
            <ExistingEntries tmdbId={selected.tmdbId} />
          </>
        )}
      </div>

      {/* Step 2 — Platform + details */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            2. Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          >
            <option value="">Select platform…</option>
            {platforms.map((p) => (
              <option key={p.name} value={p.name}>{p.displayName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            3. Deep link <span className="text-cinema-muted/40 normal-case">(optional)</span>
          </label>
          <input
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="https://www.netflix.com/…"
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            4. Available until <span className="text-cinema-muted/40 normal-case">(optional)</span>
          </label>
          <input
            type="date"
            value={availableUntil}
            onChange={(e) => setAvailableUntil(e.target.value)}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSeed}
          disabled={!selected || !platform || isPending}
          className="px-5 py-2.5 rounded-lg accent-gradient text-white font-body font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:shadow-accent-glow"
        >
          {isPending ? <><Loader2 size={15} className="animate-spin" /> Seeding…</> : 'Seed Availability'}
        </button>

        {successMsg && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-body">
            <Check size={14} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-body">
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-accent" />
      <span className="text-cinema-muted">{icon}</span>
      <h2 className="font-heading font-semibold text-cinema-text text-base">{title}</h2>
    </div>
  )
}

// ─── AI Usage tab ─────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  'review-summary': 'AI Review Summary',
  'suggest':        'Mood Discovery',
  'nl-search':      'Describe It Search',
}

function AiUsageTab() {
  const { data, isLoading } = useAiUsageStats()

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString()
  const fmtCost = (n: number | undefined) =>
    `$${((n ?? 0)).toFixed(4)}`

  const summaryCards = [
    { label: 'Calls today',        value: fmt(data?.totalCallsToday) },
    { label: 'Calls this week',    value: fmt(data?.totalCallsThisWeek) },
    { label: 'Claude calls',       value: fmt(data?.claudeCallsThisWeek) },
    { label: 'Cache hits',         value: fmt(data?.cacheHitsThisWeek) },
    { label: 'Cache hit rate',     value: isLoading ? '—' : `${data?.cacheHitRatePct ?? 0}%` },
    { label: 'Est. cost (7 days)', value: isLoading ? '—' : fmtCost(data?.estimatedCostUsdThisWeek) },
  ]

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div>
        <SectionHeading icon={<Sparkles size={16} />} title="This Week" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {summaryCards.map(({ label, value }) => (
            <div key={label} className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 space-y-2">
              <div className="text-cinema-muted"><Sparkles size={16} /></div>
              <div className="font-heading font-bold text-2xl text-cinema-text">
                {isLoading ? '—' : value}
              </div>
              <div className="text-cinema-muted/60 text-xs font-body">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Token totals */}
      {!isLoading && data && (
        <div className="rounded-xl border border-cinema-navy-border bg-cinema-navy p-4 text-sm font-body space-y-1">
          <p className="text-cinema-muted/70">
            Input tokens this week: <span className="text-cinema-text font-medium">{fmt(data.totalInputTokensThisWeek)}</span>
            <span className="text-cinema-muted/40 ml-2">(${(data.totalInputTokensThisWeek / 1_000_000 * 0.80).toFixed(4)})</span>
          </p>
          <p className="text-cinema-muted/70">
            Output tokens this week: <span className="text-cinema-text font-medium">{fmt(data.totalOutputTokensThisWeek)}</span>
            <span className="text-cinema-muted/40 ml-2">(${(data.totalOutputTokensThisWeek / 1_000_000 * 4.00).toFixed(4)})</span>
          </p>
          <p className="text-cinema-muted/40 text-xs mt-2">Pricing: Claude Haiku — $0.80/M input · $4.00/M output</p>
        </div>
      )}

      {/* Per-feature breakdown */}
      {!isLoading && data && data.byFeature.length > 0 && (
        <div>
          <SectionHeading icon={<BarChart2 size={16} />} title="By Feature" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="text-cinema-muted/60 text-xs border-b border-cinema-navy-border">
                  <th className="text-left py-2 pr-4">Feature</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-right py-2 px-3">Claude calls</th>
                  <th className="text-right py-2 px-3">Cache hits</th>
                  <th className="text-right py-2 px-3">Hit rate</th>
                  <th className="text-right py-2 pl-3">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {data.byFeature.map((f: AiFeatureStat) => {
                  const hitRate = f.totalCalls > 0
                    ? Math.round(f.cacheHits / f.totalCalls * 100)
                    : 0
                  return (
                    <tr key={f.feature} className="border-b border-cinema-navy-border/40 hover:bg-cinema-navy-hover transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                            <Sparkles size={9} /> {FEATURE_LABELS[f.feature] ?? f.feature}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-cinema-text">{fmt(f.totalCalls)}</td>
                      <td className="text-right py-3 px-3 text-cinema-text">{fmt(f.claudeCalls)}</td>
                      <td className="text-right py-3 px-3 text-green-400/80">{fmt(f.cacheHits)}</td>
                      <td className="text-right py-3 px-3">
                        <span className={`font-medium ${hitRate >= 50 ? 'text-green-400' : hitRate >= 20 ? 'text-yellow-400' : 'text-cinema-muted'}`}>
                          {hitRate}%
                        </span>
                      </td>
                      <td className="text-right py-3 pl-3 text-cinema-muted">{fmtCost(f.estimatedCostUsd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily trend */}
      {!isLoading && data && data.dailyTrend.length > 0 && (
        <div>
          <SectionHeading icon={<BarChart2 size={16} />} title="Daily Trend (7 days)" />
          <div className="space-y-2">
            {data.dailyTrend.map((d) => {
              const total = d.totalCalls
              const maxForScale = Math.max(...data.dailyTrend.map((x) => x.totalCalls), 1)
              const barPct = Math.round((total / maxForScale) * 100)
              const claudePct = total > 0 ? Math.round((d.claudeCalls / total) * 100) : 0
              return (
                <div key={d.date} className="flex items-center gap-3 text-xs font-body">
                  <span className="text-cinema-muted/60 w-20 shrink-0">{d.date.slice(5)}</span>
                  <div className="flex-1 h-5 bg-cinema-navy rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500/40 relative"
                      style={{ width: `${barPct}%` }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full bg-purple-500 rounded-full"
                        style={{ width: `${claudePct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-cinema-text w-8 text-right">{total}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-3 text-xs font-body text-cinema-muted/40 mt-1">
              <span className="w-20" />
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-purple-500 inline-block" /> Claude calls</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-purple-500/30 inline-block" /> Cache hits</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && data && data.totalCallsThisWeek === 0 && (
        <p className="text-center text-cinema-muted font-body py-12 text-sm">
          No AI usage recorded yet. Logs will appear here after the first search or summary request.
        </p>
      )}
    </div>
  )
}
