import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteReview, getReviews, likeReview, reportReview, upsertReview } from '@/api/reviews'
import type { ReviewsResponse } from '@/types'

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

export function useLikeReview(tmdbId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => likeReview(tmdbId, reviewId),
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', tmdbId] })
      const prev = queryClient.getQueryData<ReviewsResponse>(['reviews', tmdbId])
      if (prev) {
        queryClient.setQueryData<ReviewsResponse>(['reviews', tmdbId], {
          ...prev,
          reviews: prev.reviews.map(r =>
            r.id === reviewId
              ? { ...r, isLikedByMe: !r.isLikedByMe, likeCount: r.isLikedByMe ? r.likeCount - 1 : r.likeCount + 1 }
              : r
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['reviews', tmdbId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', tmdbId] })
    },
  })
}

export function useReportReview(tmdbId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => reportReview(tmdbId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', tmdbId] })
    },
  })
}
