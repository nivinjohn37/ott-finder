import type { ApiResponse, MovieDetail, MovieSearchResult } from '@/types'
import api from './axios'

export async function searchMovies(q: string): Promise<MovieSearchResult[]> {
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/search', { params: { q } })
  return res.data.data ?? []
}

export async function getTrending(): Promise<MovieSearchResult[]> {
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/trending')
  return res.data.data ?? []
}

export async function getMovieDetail(tmdbId: number, type?: string): Promise<MovieDetail> {
  const res = await api.get<ApiResponse<MovieDetail>>(`/movies/${tmdbId}`, {
    params: type ? { type } : undefined,
  })
  if (!res.data.data) throw new Error('Movie not found')
  return res.data.data
}
