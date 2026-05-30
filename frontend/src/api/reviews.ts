import type { ApiResponse, ReviewsResponse, ReviewDto } from '@/types'
import api from './axios'

export async function getReviews(tmdbId: number, page = 0): Promise<ReviewsResponse> {
  const res = await api.get<ApiResponse<ReviewsResponse>>(`/movies/${tmdbId}/reviews`, {
    params: { page },
  })
  return res.data.data ?? { totalReviews: 0, averageRating: 0, myReview: null, reviews: [], hasMore: false }
}

export async function upsertReview(tmdbId: number, rating: number, note: string): Promise<ReviewDto> {
  const res = await api.post<ApiResponse<ReviewDto>>(`/movies/${tmdbId}/reviews`, { rating, note })
  if (!res.data.data) throw new Error('Failed to save review')
  return res.data.data
}

export async function deleteReview(tmdbId: number): Promise<void> {
  await api.delete(`/movies/${tmdbId}/reviews`)
}

export async function likeReview(tmdbId: number, reviewId: number): Promise<{ liked: boolean; likeCount: number }> {
  const res = await api.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/movies/${tmdbId}/reviews/${reviewId}/like`)
  return res.data.data ?? { liked: false, likeCount: 0 }
}

export async function reportReview(tmdbId: number, reviewId: number): Promise<void> {
  await api.post(`/movies/${tmdbId}/reviews/${reviewId}/report`)
}
