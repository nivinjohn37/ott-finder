import { TrendingUp } from 'lucide-react'
import { useTrending } from '@/hooks/useMovies'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'

export function TrendingPage() {
  const { data, isLoading, isError } = useTrending()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 rounded-full bg-accent" />
        <div>
          <h1 className="font-heading font-bold text-2xl text-cinema-text flex items-center gap-2">
            <TrendingUp size={24} className="text-accent" /> Trending in India
          </h1>
          <p className="text-cinema-muted text-sm font-body mt-0.5">
            Most popular on Indian OTT platforms right now
          </p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonGrid count={20} />
      ) : isError ? (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Failed to load"
          description="Unable to fetch trending content. Please try again later."
        />
      ) : data && data.length > 0 ? (
        <MovieGrid movies={data} />
      ) : (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Nothing trending yet"
          description="Check back later for trending movies and shows."
        />
      )}
    </div>
  )
}
