import type { ApiResponse, UserPreferences, UserStats } from '@/types'
import api from './axios'

export async function getUserStats(): Promise<UserStats> {
  const res = await api.get<ApiResponse<UserStats>>('/user/stats')
  return res.data.data ?? { favouriteGenre: null, totalWatchlist: 0, totalWatched: 0 }
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await api.get<ApiResponse<UserPreferences>>('/user/preferences')
  return res.data.data ?? { genres: [], platforms: [] }
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const res = await api.put<ApiResponse<UserPreferences>>('/user/preferences', prefs)
  return res.data.data ?? prefs
}
