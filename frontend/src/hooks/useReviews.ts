import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteReview, getReviews, upsertReview } from '@/api/reviews'

export function useReviews(tmdbId: number) {
  return useQuery({
    queryKey: ['reviews', tmdbId],
    queryFn: () => getReviews(tmdbId),
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpsertReview(tmdbId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rating, note }: { rating: number; note: string }) =>
      upsertReview(tmdbId, rating, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', tmdbId] })
    },
  })
}

export function useDeleteReview(tmdbId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteReview(tmdbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', tmdbId] })
    },
  })
}
