import type { ApiResponse, MoodAnswers, MovieDetail, MovieSearchResult, MovieSuggestion, PersonFilmography, ReviewSummary, ShelvesResult } from '@/types'
import api from './axios'

export async function searchMovies(q: string): Promise<MovieSearchResult[]> {
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/search', { params: { q } })
  return res.data.data ?? []
}

export async function getTrending(region?: string, language?: string): Promise<MovieSearchResult[]> {
  const params: Record<string, string> = {}
  if (region && region !== 'global') params.region = region
  if (language && language !== 'all') params.language = language
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/trending', {
    params: Object.keys(params).length > 0 ? params : undefined,
  })
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

export async function getShelves(): Promise<ShelvesResult> {
  const empty: ShelvesResult = { topRatedNetflix: [], hiddenGems: [], newArrivals: [], leavingSoon: [], forYou: [] }
  try {
    const res = await api.get<ApiResponse<ShelvesResult>>('/movies/shelves')
    return res.data.data ?? empty
  } catch {
    return empty
  }
}

export async function getMoodSuggestions(
  answers: MoodAnswers,
  exclude?: string[]
): Promise<MovieSuggestion[]> {
  const params: Record<string, string> = { ...answers }
  if (exclude && exclude.length > 0) params.exclude = exclude.join(',')
  const res = await api.get<ApiResponse<MovieSuggestion[]>>('/ai/suggest', { params })
  return res.data.data ?? []
}

export async function getReviewSummary(
  tmdbId: number,
  type: string,
  spoilers: boolean,
  title: string
): Promise<ReviewSummary | null> {
  try {
    const res = await api.get<ApiResponse<ReviewSummary>>(`/ai/review-summary/${tmdbId}`, {
      params: { type, spoilers, title },
    })
    return res.data.data ?? null
  } catch {
    return null
  }
}

export async function getNlSearch(query: string): Promise<MovieSuggestion[]> {
  const res = await api.get<ApiResponse<MovieSuggestion[]>>('/ai/nl-search', { params: { q: query } })
  return res.data.data ?? []
}

async function resizeImageToJpeg(file: File, maxDim = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height)
        width  = Math.floor(width  * scale)
        height = Math.floor(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

export async function snapSearch(file: File): Promise<MovieSuggestion | null> {
  const resized = await resizeImageToJpeg(file)
  const form = new FormData()
  form.append('image', resized, 'image.jpg')
  const res = await api.post<ApiResponse<MovieSuggestion>>('/ai/snap-search', form)
  return res.data.data ?? null
}

export async function getGenreMovies(genreName: string, mediaType = 'movie'): Promise<MovieSearchResult[]> {
  const res = await api.get<ApiResponse<MovieSearchResult[]>>('/movies/genre', {
    params: { name: genreName, mediaType },
  })
  return res.data.data ?? []
}
