export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
  timestamp: string
}

export interface OttAvailability {
  platformName: string
  displayName: string
  logoUrl: string | null
  deepLink: string | null
  availableUntil: string | null
}

export interface MovieSearchResult {
  tmdbId: number
  title: string
  posterUrl: string | null
  backdropUrl: string | null
  overview: string | null
  releaseDate: string | null
  mediaType: 'movie' | 'tv'
  voteAverage: number
  platforms: OttAvailability[]
}

export interface MovieDetail extends MovieSearchResult {
  voteCount: number
}

export interface MovieSummary {
  tmdbId: number
  title: string
  posterUrl: string | null
  mediaType: 'movie' | 'tv'
  voteAverage: number
}

export interface WatchlistItem {
  id: number
  movie: MovieSummary & { platforms: OttAvailability[] }
  addedAt: string
  expiringPlatforms: OttAvailability[]
}

export type MediaType = 'movie' | 'tv'

export const PLATFORM_COLORS: Record<string, string> = {
  netflix: '#E50914',
  primevideo: '#00A8E0',
  prime: '#00A8E0',
  jiohotstar: '#1F80E0',
  hotstar: '#1F80E0',
  jiocinema: '#8B4CF7',
  sonyliv: '#C40A0A',
  zee5: '#7B2FBE',
  mxplayer: '#00D4FF',
}

export function getPlatformColor(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '')
  return PLATFORM_COLORS[key] ?? '#8899AA'
}
