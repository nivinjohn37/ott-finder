import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useSearch } from '@/hooks/useMovies'
import { SearchBar } from '@/components/movie/SearchBar'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { MediaType } from '@/types'

type SortBy = 'relevance' | 'rating_desc' | 'year_desc' | 'year_asc'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating_desc', label: 'Rating: High → Low' },
  { value: 'year_desc', label: 'Year: Newest First' },
  { value: 'year_asc', label: 'Year: Oldest First' },
]

const PLATFORMS = [
  { name: 'netflix', label: 'Netflix' },
  { name: 'primevideo', label: 'Prime' },
  { name: 'hotstar', label: 'Hotstar' },
  { name: 'jiocinema', label: 'JioCinema' },
  { name: 'sonyliv', label: 'SonyLIV' },
  { name: 'zee5', label: 'ZEE5' },
  { name: 'mxplayer', label: 'MX Player' },
]

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const typeParam = params.get('type')
  const mediaFilter: MediaType | 'all' = typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all'
  const sortParam = params.get('sort')
  const SORT_VALUES: SortBy[] = ['relevance', 'rating_desc', 'year_desc', 'year_asc']
  const sortBy: SortBy = SORT_VALUES.includes(sortParam as SortBy) ? (sortParam as SortBy) : 'relevance'
  const activePlatforms = new Set(params.get('platforms')?.split(',').filter(Boolean) ?? [])
  const [sortOpen, setSortOpen] = useState(false)

  const { data, isLoading, isFetching } = useSearch(query)

  function setMediaFilter(value: MediaType | 'all') {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      value === 'all' ? next.delete('type') : next.set('type', value)
      return next
    }, { replace: true })
  }

  function setSortBy(value: SortBy) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      value === 'relevance' ? next.delete('sort') : next.set('sort', value)
      return next
    }, { replace: true })
  }

  function togglePlatform(name: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      const current = new Set(prev.get('platforms')?.split(',').filter(Boolean) ?? [])
      current.has(name) ? current.delete(name) : current.add(name)
      current.size > 0 ? next.set('platforms', [...current].join(',')) : next.delete('platforms')
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('type')
      next.delete('sort')
      next.delete('platforms')
      return next
    }, { replace: true })
  }

  const hasActiveFilters = mediaFilter !== 'all' || sortBy !== 'relevance' || activePlatforms.size > 0

  const displayed = useMemo(() => {
    let result = data ?? []
    if (mediaFilter !== 'all') result = result.filter((m) => m.mediaType === mediaFilter)
    if (activePlatforms.size > 0) {
      result = result.filter((m) => m.platforms.some((p) => activePlatforms.has(p.platformName)))
    }
    const sorted = [...result]
    if (sortBy === 'rating_desc') sorted.sort((a, b) => b.voteAverage - a.voteAverage)
    else if (sortBy === 'year_desc') sorted.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    else if (sortBy === 'year_asc') sorted.sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''))
    return sorted
  }, [data, mediaFilter, activePlatforms, sortBy])

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SearchBar defaultValue={query} autoFocus={!query} />

      {query && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Row 1: result count + sort dropdown */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-cinema-muted font-body text-sm shrink-0">
              {isLoading || isFetching ? ' ' : displayed.length > 0
                ? `${displayed.length} result${displayed.length > 1 ? 's' : ''} for "${query}"`
                : `No results for "${query}"`}
            </p>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-body text-cinema-muted/60 hover:text-accent transition-colors"
                >
                  <X size={12} /> Clear filters
                </button>
              )}

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text text-xs font-body transition-colors"
                >
                  <SlidersHorizontal size={13} />
                  <span className="hidden sm:inline">{currentSortLabel}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
                </button>

                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 z-20 bg-cinema-navy border border-cinema-navy-border rounded-xl shadow-card-hover overflow-hidden min-w-[190px]">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-body transition-colors ${
                            sortBy === opt.value
                              ? 'text-accent bg-accent/10'
                              : 'text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy-hover'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: media type pills + platform chips — horizontally scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {(['all', 'movie', 'tv'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMediaFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors whitespace-nowrap shrink-0 ${
                  mediaFilter === f
                    ? 'bg-accent text-white'
                    : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text border border-cinema-navy-border'
                }`}
              >
                {f === 'all' ? 'All' : f === 'tv' ? 'TV Shows' : 'Movies'}
              </button>
            ))}

            <div className="w-px h-4 bg-cinema-navy-border shrink-0 mx-1" />

            {PLATFORMS.map((p) => (
              <button
                key={p.name}
                onClick={() => togglePlatform(p.name)}
                className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activePlatforms.has(p.name)
                    ? 'bg-accent text-white'
                    : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text border border-cinema-navy-border'
                }`}
              >
                {p.label}
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
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No results found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or clearing them.'
              : `We couldn't find anything for "${query}". Try a different search.`
          }
        />
      ) : (
        <MovieGrid movies={displayed} />
      )}
    </div>
  )
}
