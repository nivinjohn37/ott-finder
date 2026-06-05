import { motion } from 'framer-motion'
import { TrendingUp, Search, Star, Sparkles, Clock, Tv, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTrending, useShelves } from '@/hooks/useMovies'
import { useRegion } from '@/context/RegionContext'
import { HeroSection } from '@/components/movie/HeroSection'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { SearchBar } from '@/components/movie/SearchBar'
import { RecentlyViewedShelf } from '@/components/movie/RecentlyViewedShelf'
import { CuratedShelf } from '@/components/movie/CuratedShelf'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useAuth } from '@/context/AuthContext'

export function HomePage() {
  const { region } = useRegion()
  const { data: trending, isLoading, isError } = useTrending(region.code)
  const { data: shelves } = useShelves()
  const { items: recentlyViewed, clearAll } = useRecentlyViewed()
  const { user } = useAuth()
  const trendingLabel = region.code === 'global' ? 'Trending Globally' : `Trending in ${region.label}`

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
          <SearchBar showAiLink />
        </motion.div>

        {/* Recently viewed — logged-in users only */}
        {user && <RecentlyViewedShelf items={recentlyViewed} onClear={clearAll} />}

        {/* For You — logged-in users with preferences */}
        {user && shelves && shelves.forYou.length > 0 && (
          <CuratedShelf
            title="For You"
            icon={<User size={18} className="text-accent" />}
            movies={shelves.forYou}
          />
        )}

        {/* Leaving Soon */}
        {shelves && shelves.leavingSoon.length > 0 && (
          <CuratedShelf
            title="Leaving Soon"
            icon={<Clock size={18} className="text-red-400" />}
            movies={shelves.leavingSoon}
            showExpiry
          />
        )}

        {/* Top Rated on Netflix India */}
        {shelves && shelves.topRatedNetflix.length > 0 && (
          <CuratedShelf
            title="Top Rated on Netflix"
            icon={<Star size={18} className="text-red-500" />}
            movies={shelves.topRatedNetflix}
          />
        )}

        {/* Hidden Gems */}
        {shelves && shelves.hiddenGems.length > 0 && (
          <CuratedShelf
            title="Hidden Gems"
            icon={<Sparkles size={18} className="text-yellow-400" />}
            movies={shelves.hiddenGems}
          />
        )}

        {/* New Arrivals */}
        {shelves && shelves.newArrivals.length > 0 && (
          <CuratedShelf
            title="New Arrivals"
            icon={<Tv size={18} className="text-sky-badge" />}
            movies={shelves.newArrivals}
          />
        )}

        {/* Trending grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-accent" />
              <h2 className="font-heading font-bold text-xl text-cinema-text flex items-center gap-2">
                <TrendingUp size={20} className="text-accent" />
                {trendingLabel}
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
