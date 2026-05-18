import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useSearch } from '@/hooks/useMovies'
import { SearchBar } from '@/components/movie/SearchBar'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { MediaType } from '@/types'

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const [filter, setFilter] = useState<MediaType | 'all'>('all')

  const { data, isLoading, isFetching } = useSearch(query)

  const filtered =
    filter === 'all'
      ? data ?? []
      : (data ?? []).filter((m) => m.mediaType === filter)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SearchBar defaultValue={query} autoFocus={!query} />

      {query && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div>
            {!isLoading && (
              <p className="text-cinema-muted font-body text-sm">
                {filtered.length > 0
                  ? `${filtered.length} result${filtered.length > 1 ? 's' : ''} for "${query}"`
                  : `No results for "${query}"`}
              </p>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-cinema-muted" />
            {(['all', 'movie', 'tv'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-accent text-white'
                    : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text border border-cinema-navy-border'
                }`}
              >
                {f === 'all' ? 'All' : f === 'tv' ? 'TV Shows' : 'Movies'}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {!query ? (
        <EmptyState
          icon={<Search size={28} />}
          title="Search for movies & shows"
          description="Find what's streaming on Netflix, Prime, Hotstar, JioCinema and more."
        />
      ) : isLoading || isFetching ? (
        <SkeletonGrid count={12} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No results found"
          description={`We couldn't find anything for "${query}". Try a different search.`}
        />
      ) : (
        <MovieGrid movies={filtered} />
      )}
    </div>
  )
}
