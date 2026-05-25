import type { ApiResponse, MovieDetail, MovieSearchResult, PersonFilmography } from '@/types'
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

export async function getPersonFilmography(personId: number): Promise<PersonFilmography> {
  const res = await api.get<ApiResponse<PersonFilmography>>(`/movies/person/${personId}`)
  if (!res.data.data) throw new Error('Person not found')
  return res.data.data
}

export async function getGenreMovies(genreName: string, mediaType = 'movie'): Promise<MovieSearchResult[]> {
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/genre', {
    params: { name: genreName, mediaType },
  })
  return res.data.data ?? []
}
