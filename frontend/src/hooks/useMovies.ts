import { useQuery } from '@tanstack/react-query'
import { searchMovies, getTrending, getMovieDetail, getPersonFilmography, getGenreMovies } from '@/api/movies'

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['movies', 'search', query],
    queryFn: () => searchMovies(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrending() {
  return useQuery({
    queryKey: ['movies', 'trending'],
    queryFn: getTrending,
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
