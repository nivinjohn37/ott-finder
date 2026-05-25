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

export interface CastMember {
  personId?: number | null
  name: string
  character: string
  profileUrl: string | null
}

export interface PersonFilmography {
  personId: number
  name: string | null
  profileUrl: string | null
  knownFor: string | null
  credits: MovieSearchResult[]
}

export interface MovieDetail extends MovieSearchResult {
  voteCount: number
  trailerKey: string | null
  tagline: string | null
  runtime: number | null
  genres: string[]
  cast: CastMember[]
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
  watchedAt: string | null
  expiringPlatforms: OttAvailability[]
}

export interface UserMe {
  uid: string
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

export interface UserStats {
  favouriteGenre: string | null
  totalWatchlist: number
  totalWatched: number
}

export interface UserPreferences {
  genres: string[]
  platforms: string[]
}

export interface AdminStats {
  totalUsers: number
  totalWatchlistEntries: number
  totalMoviesInDb: number
  totalPlatforms: number
}

export interface AdminUserDto {
  id: number
  email: string
  displayName: string | null
  role: string
  joinedAt: string | null
  watchlistCount: number
  reviewCount: number
  blacklisted: boolean
}

export interface ReviewDto {
  id: number
  userDisplayName: string
  userAvatarUrl: string | null
  rating: number
  note: string | null
  createdAt: string
  isOwn: boolean
}

export interface ReviewsResponse {
  totalReviews: number
  averageRating: number
  myReview: ReviewDto | null
  reviews: ReviewDto[]
  hasMore: boolean
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
