import { motion } from 'framer-motion'
import { TrendingUp, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTrending } from '@/hooks/useMovies'
import { HeroSection } from '@/components/movie/HeroSection'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchBar } from '@/components/movie/SearchBar'
import { RecentlyViewedShelf } from '@/components/movie/RecentlyViewedShelf'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useAuth } from '@/context/AuthContext'

export function HomePage() {
  const { data: trending, isLoading, isError } = useTrending()
  const { items: recentlyViewed, clearAll } = useRecentlyViewed()
  const { user } = useAuth()

  return (
    <div>
      {/* Hero */}
      {isLoading ? (
        <div className="h-[70vh] min-h-[500px] bg-cinema-navy animate-pulse" />
      ) : trending && trending.length > 0 ? (
        <HeroSection movies={trending} />
      ) : null}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Search CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <SearchBar />
        </motion.div>

        {/* Recently viewed — logged-in users only */}
        {user && <RecentlyViewedShelf items={recentlyViewed} onClear={clearAll} />}

        {/* Trending grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-accent" />
              <h2 className="font-heading font-bold text-xl text-cinema-text flex items-center gap-2">
                <TrendingUp size={20} className="text-accent" />
                Trending Now
              </h2>
            </div>
            <Link
              to="/trending"
              className="text-sm font-body text-accent hover:text-accent/80 transition-colors"
            >
              See all
            </Link>
          </div>

          {isLoading ? (
            <SkeletonGrid count={12} />
          ) : isError ? (
            <EmptyState
              icon={<Search size={28} />}
              title="Couldn't load trending"
              description="Failed to fetch trending content. Please try again."
            />
          ) : trending && trending.length > 0 ? (
            <MovieGrid movies={trending.slice(0, 12)} />
          ) : (
            <EmptyState
              icon={<TrendingUp size={28} />}
              title="No trending content"
              description="Check back soon for trending movies and shows."
            />
          )}
        </section>
      </div>
    </div>
  )
}
