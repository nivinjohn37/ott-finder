import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Clock, LogIn } from 'lucide-react'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useAuth } from '@/context/AuthContext'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Link } from 'react-router-dom'

function WatchlistSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 rounded-xl skeleton" />
      ))}
    </div>
  )
}

export function WatchlistPage() {
  const { user, signInWithGoogle } = useAuth()
  const { data, isLoading } = useWatchlist()

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon={<LogIn size={28} />}
          title="Sign in to see your watchlist"
          description="Keep track of movies and shows you want to watch across all Indian OTT platforms."
          action={
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-6 py-3 rounded-lg accent-gradient text-white font-body font-semibold"
            >
              Sign in with Google
            </button>
          }
        />
      </div>
    )
  }

  const expiring = data?.filter((i) => i.expiringPlatforms.length > 0) ?? []
  const regular = data?.filter((i) => i.expiringPlatforms.length === 0) ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-accent" />
          <div>
            <h1 className="font-heading font-bold text-2xl text-cinema-text flex items-center gap-2">
              <Bookmark size={22} className="text-accent" /> My Watchlist
            </h1>
            <p className="text-cinema-muted text-sm font-body mt-0.5">
              {data ? `${data.length} item${data.length !== 1 ? 's' : ''}` : '…'}
              {' · '}
              <span className="text-cinema-muted/60 text-xs">Free tier: up to 3</span>
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <WatchlistSkeleton />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={28} />}
          title="Your watchlist is empty"
          description="Add movies and shows to track them across platforms and get expiry alerts."
          action={
            <Link
              to="/"
              className="px-6 py-2.5 rounded-lg accent-gradient text-white font-body font-medium text-sm"
            >
              Browse Trending
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Expiring soon section */}
          {expiring.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-accent" />
                <h2 className="font-heading font-semibold text-base text-accent">
                  Leaving Soon
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-body border border-accent/20">
                  {expiring.length}
                </span>
              </div>
              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {expiring.map((item) => (
                    <WatchlistCard key={item.id} item={item} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}

          {/* Regular items */}
          {regular.length > 0 && (
            <section>
              {expiring.length > 0 && (
                <h2 className="font-heading font-semibold text-base text-cinema-muted mb-4">
                  Rest of Your List
                </h2>
              )}
              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {regular.map((item) => (
                    <WatchlistCard key={item.id} item={item} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
