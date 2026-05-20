import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { User, Film, Tv, Eye, Bookmark, Calendar } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useWatchlist } from '@/hooks/useWatchlist'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: watchlist, isLoading } = useWatchlist()

  if (!user) return <Navigate to="/" replace />

  const joinedDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const total = watchlist?.length ?? 0
  const watched = watchlist?.filter((i) => !!i.watchedAt).length ?? 0
  const unwatched = total - watched
  const movies = watchlist?.filter((i) => i.movie.mediaType === 'movie').length ?? 0
  const tvShows = total - movies
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center mb-10"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'User'}
            className="w-24 h-24 rounded-full ring-4 ring-accent/30 shadow-accent-glow"
          />
        ) : (
          <div className="w-24 h-24 rounded-full accent-gradient flex items-center justify-center shadow-accent-glow">
            <User size={40} className="text-white" />
          </div>
        )}

        <div>
          <h1 className="font-heading font-bold text-2xl text-cinema-text">
            {user.displayName ?? 'Movie Fan'}
          </h1>
          <p className="text-cinema-muted font-body text-sm mt-0.5">{user.email}</p>
          {joinedDate && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-cinema-muted/50 text-xs font-body">
              <Calendar size={11} />
              <span>Member since {joinedDate}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        <StatCard icon={<Bookmark size={18} />} label="In Watchlist" value={total} loading={isLoading} />
        <StatCard icon={<Eye size={18} />} label="Watched" value={watched} loading={isLoading} green />
        <StatCard icon={<Film size={18} />} label="Movies" value={movies} loading={isLoading} />
        <StatCard icon={<Tv size={18} />} label="TV Shows" value={tvShows} loading={isLoading} />
      </motion.div>

      {/* Progress bar */}
      {(total > 0 || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold text-cinema-text text-sm">
              Watchlist Progress
            </span>
            <span className="text-cinema-muted text-xs font-body">
              {watched}/{total} watched
            </span>
          </div>

          <div className="h-2 rounded-full bg-cinema-navy-border overflow-hidden">
            <motion.div
              className="h-full rounded-full accent-gradient"
              initial={{ width: 0 }}
              animate={{ width: isLoading ? '0%' : `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 }}
            />
          </div>

          <p className="text-cinema-muted/50 text-xs font-body mt-2">
            {isLoading
              ? 'Loading…'
              : unwatched === 0 && total > 0
              ? 'All caught up!'
              : `${unwatched} still to watch`}
          </p>
        </motion.div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  loading,
  green,
}: {
  icon: ReactNode
  label: string
  value: number
  loading: boolean
  green?: boolean
}) {
  return (
    <div className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 flex flex-col gap-2">
      <div className={green ? 'text-green-400' : 'text-cinema-muted'}>{icon}</div>
      <div className={`font-heading font-bold text-2xl ${green ? 'text-green-400' : 'text-cinema-text'}`}>
        {loading ? '—' : value}
      </div>
      <div className="text-cinema-muted/60 text-xs font-body">{label}</div>
    </div>
  )
}
