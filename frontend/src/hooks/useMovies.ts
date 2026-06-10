import { useQuery, useMutation } from '@tanstack/react-query'
import { searchMovies, getTrending, getMovieDetail, getPersonFilmography, getGenreMovies, getShelves, getReviewSummary, getMoodSuggestions, getNlSearch, snapSearch } from '@/api/movies'
import { useAuth } from '@/context/AuthContext'
import type { MoodAnswers } from '@/types'

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['movies', 'search', query],
    queryFn: () => searchMovies(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrending(region?: string, language?: string) {
  return useQuery({
    queryKey: ['movies', 'trending', region ?? 'global', language ?? 'all'],
    queryFn: () => getTrending(region, language),
    staleTime: 10 * 60 * 1000,
  })
}

export function useMovieDetail(tmdbId: number, type?: string) {
  return useQuery({
    queryKey: ['movies', 'detail', tmdbId, type],
    queryFn: () => getMovieDetail(tmdbId, type),
    staleTime: 15 * 60 * 1000,
  })
}

export function useGenreMovies(genreName: string | null, mediaType = 'movie') {
  return useQuery({
    queryKey: ['genre', genreName, mediaType],
    queryFn: () => getGenreMovies(genreName!, mediaType),
    enabled: !!genreName,
    staleTime: 6 * 60 * 60 * 1000,
  })
}

export function usePersonFilmography(personId: number | null) {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: () => getPersonFilmography(personId!),
    enabled: personId !== null && personId > 0,
    staleTime: 30 * 60 * 1000,
  })
}

export function useMoodSuggestions() {
  return useMutation({
    mutationFn: ({ answers, exclude }: { answers: MoodAnswers; exclude?: string[] }) =>
      getMoodSuggestions(answers, exclude),
  })
}

export function useNlSearch(query: string) {
  return useQuery({
    queryKey: ['nl-search', query],
    queryFn: () => getNlSearch(query),
    enabled: query.length >= 5,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })
}

export function useSnapSearch() {
  return useMutation({
    mutationFn: (file: File) => snapSearch(file),
  })
}

export function useReviewSummary(tmdbId: number, type: string, spoilers: boolean, title: string, enabled: boolean) {
  return useQuery({
    queryKey: ['review-summary', tmdbId, spoilers],
    queryFn: () => getReviewSummary(tmdbId, type, spoilers, title),
    enabled,
    staleTime: 48 * 60 * 60 * 1000,
    retry: 1,
  })
}

export function useShelves() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['movies', 'shelves', user?.uid ?? 'anon'],
    queryFn: getShelves,
    staleTime: 30 * 60 * 1000,
  })
}
