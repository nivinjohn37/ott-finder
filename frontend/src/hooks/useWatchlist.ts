import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '@/api/watchlist'
import { useAuth } from '@/context/AuthContext'

export function useWatchlist() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

export function useAddToWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ movieId, mediaType }: { movieId: number; mediaType: string }) =>
      addToWatchlist(movieId, mediaType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (watchlistId: number) => removeFromWatchlist(watchlistId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useIsInWatchlist(tmdbId: number) {
  const { data } = useWatchlist()
  return data?.some((item) => item.movie.tmdbId === tmdbId) ?? false
}
